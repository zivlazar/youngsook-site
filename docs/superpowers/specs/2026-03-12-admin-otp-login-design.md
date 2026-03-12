# Admin OTP Login — Design Spec

**Date:** 2026-03-12
**Status:** In Review

## Overview

Replace the current email + password admin login with a passwordless 6-digit OTP flow. When the admin navigates to `/admin`, they enter their email address, receive a one-time code via Resend, and paste it into the login page to obtain a JWT session.

---

## User Flow

1. Admin visits `/admin`
2. Enters email address → clicks "Send Code"
3. Worker validates email silently (no error if wrong — prevents probing); rate-limit is server-enforced at 3 requests per 15 minutes
4. If email matches `ADMIN_EMAIL`: generate 6-digit code, store in KV with 10-minute TTL, send via Resend
5. If Resend call fails: return `502` `{ error: "Failed to send email" }` — UI shows error on Step 1, cooldown timer is **not** started
6. If rate limit exceeded: return `429` `{ error: "Too many requests" }` — UI shows "Too many attempts, please wait" on Step 1, cooldown timer is **not** started
7. On success (`200`): page transitions to Step 2 and the 30-second UI cooldown timer starts
8. Admin copies code from email → pastes into 6-digit input → clicks "Verify"
9. On success: JWT stored in `localStorage` (see Security Properties), redirect to `/admin/dashboard`
10. On wrong code: error shown, retry allowed (up to 5 attempts before code is invalidated and a new one must be requested)
11. "Resend code" link available after the 30-second UI cooldown (UX only — the authoritative rate limit is the server-enforced 3 requests/15 minutes)
12. "Use a different email" link on Step 2 — resets all state and returns to Step 1

---

## Worker Changes

### New endpoints (replace `POST /login`)

#### `POST /login/request-otp`
- Body: `{ email: string }`
- Validate body is parseable JSON; return `400` `{ error: "Invalid request" }` if not
- Normalise email to lowercase before all comparisons and KV key construction
- Rate limit: check KV key `otp_rate:{normalised_email}` (TTL 900 seconds). If count ≥ 3, return `429` `{ error: "Too many requests" }`. Otherwise increment (or create with value 1, TTL 900s)
- Validate email against `env.ADMIN_EMAIL` (lowercased) — if mismatch, return `200` `{ ok: true }` silently (no code sent, no KV write)
- Generate a cryptographically random 6-digit code via `crypto.getRandomValues`
- Call Resend API to send the code **before** writing to KV
- If Resend call fails: return `502` `{ error: "Failed to send email" }` — do **not** write the OTP to KV and do **not** increment the rate-limit counter (counter is only incremented after a successful send)
- Store in KV: key `otp:{normalised_email}`, value `{ code, attempts: 0 }`, TTL 600 seconds, **with** `metadata: { expiration: Math.floor(Date.now() / 1000) + 600 }`. This unconditionally overwrites any existing OTP entry for that email (e.g. from a prior "Resend code" request)
- Increment (or create) the rate-limit counter in KV under key `otp_rate:{normalised_email}`, TTL 900 seconds
- Return `200` `{ ok: true }`
- Apply the same CORS policy already in place for all worker endpoints

#### `POST /login/verify-otp`
- Body: `{ email: string, code: string }`
- Validate body parseable; validate `code` is a string of exactly 6 digits (`/^\d{6}$/`). Return `400` `{ error: "Invalid request" }` for malformed input
- Normalise email to lowercase
- Confirm `normalised_email === env.ADMIN_EMAIL.toLowerCase()` — return `401` `{ error: "Unauthorized" }` if not (defence-in-depth)
- Look up `otp:{normalised_email}` in KV using `getWithMetadata` to retrieve both the value and the absolute expiration time
- If missing → `404` `{ error: "Code expired or not found" }`
- If `attempts >= 5` → delete KV entry, return `429` `{ error: "Too many attempts, request a new code" }`
- If code mismatch:
  - Compute remaining TTL: `Math.max(1, Math.floor((metadata.expiration - Date.now() / 1000)))` (metadata.expiration is in seconds since epoch, as stored by the `put` call)
  - Write back `{ code, attempts: attempts + 1 }` with `expirationTtl: remainingTtl` and the same `metadata: { expiration: metadata.expiration }` — this preserves the original expiry window rather than resetting it
  - Return `401` `{ error: "Invalid code" }`
- If code matches → delete KV entry, issue JWT (HS256, 24h expiry), return `200` `{ token }`
- **Attempt boundary:** `attempts` starts at 0 and is incremented after each wrong guess. The `>= 5` check fires before the code comparison. Therefore: attempts 1–5 (where `attempts` in KV is 0–4 at the start of each call) all reach the code comparison and can succeed with the correct code. On the 6th call (`attempts == 5`), the gate fires and the entry is deleted. "Up to 5 attempts" means 5 chances to enter the correct code.
- **Note on concurrency:** The attempt increment is a non-atomic read-modify-write. Given the single-admin threat model (no realistic concurrent abuse), no locking is required.
- Apply the same CORS policy already in place for all worker endpoints

### Removed
- `POST /login` (password-based login) is deleted
- `ADMIN_PASSWORD` env var is removed

### New env vars / bindings
| Name | Type | Description |
|---|---|---|
| `OTP_KV` | KV namespace binding | Stores OTP entries and rate-limit counters |
| `RESEND_API_KEY` | Secret | Resend API key |
| `RESEND_FROM` | Env var (plain, not secret) | Verified sender address (e.g. `noreply@youngsookchoi.com`) |

---

## Frontend Changes

### `src/lib/admin-api.ts`
Remove `login(email, password)`. Add:
- `requestOtp(email: string): Promise<void>` — calls `POST /login/request-otp`; on non-200 throws with the server's `error` message (covers both `429` and `502` — the caller displays these as errors on Step 1)
- `verifyOtp(email: string, code: string): Promise<string>` — calls `POST /login/verify-otp`, returns JWT on `200`, throws with server error message otherwise

### `src/app/admin/page.tsx`
Two-step form, single component, no new files.

**State:**
- `step: 'email' | 'code'`
- `email: string`
- `code: string`
- `error: string`
- `loading: boolean`
- `resendCooldown: number` (seconds remaining, counts down from 30; UX nicety only — not a security control)

**Step 1 — Email input:**
- Email field + "Send Code" button
- On submit: call `requestOtp(email)`
  - On success (`200`): transition to `step = 'code'`, start 30s cooldown timer
  - On error (any throw): show error message, stay on Step 1, do **not** start cooldown timer

**Step 2 — Code input:**
- "Code sent to {email}" message
- Text input, `inputMode="numeric"`, `maxLength={6}`, auto-focused
- "Verify" button
- "Resend code" link — disabled and shows countdown until cooldown reaches 0; clicking resets cooldown and calls `requestOtp` again (errors shown inline)
- "Use a different email" link — resets all state (`step`, `email`, `code`, `error`, cooldown), returns to Step 1
- On submit: call `verifyOtp(email, code)` → store JWT in `localStorage` → redirect to `/admin/dashboard`
- On error: show server error message (e.g. "Invalid code", "Too many attempts, request a new code")

---

## Security Properties

| Property | Detail |
|---|---|
| No password to steal | Credentials are not stored anywhere |
| Code expiry | 10 minutes via KV TTL; TTL is not reset on failed attempts |
| Brute-force protection | Max 5 wrong attempts before code is invalidated; must request a new one |
| Email spam protection | Max 3 OTP requests per 15 minutes (server-enforced). 30s UI cooldown is a UX nicety only |
| No info leakage | `request-otp` returns `{ ok: true }` when email does not match; `502` / `429` errors are not conditional on email match |
| Defence-in-depth | `verify-otp` re-validates email against `ADMIN_EMAIL` before issuing any token |
| Email normalisation | Email is lowercased before all comparisons and KV key construction — prevents case-variant bypass of rate limits |
| localStorage XSS | JWT is stored in `localStorage`, accessible to any JS on the page. Accepted trade-off: the admin site has no third-party scripts. No CSP is currently in `public/_headers`; adding one is tracked as a future improvement but is out of scope for this feature |
| Code entropy | 6 digits = 1,000,000 combinations. With max 5 attempts per code and max 3 codes per 15 minutes, an attacker can make at most 15 guesses per 15-minute window = 0.0015% max success probability |
| Token invalidation | Out of scope; logout clears `localStorage` only. No server-side invalidation exists |

---

## HTTP Status Codes

| Endpoint | Condition | Status |
|---|---|---|
| `POST /login/request-otp` | Email matched, code sent | `200` |
| `POST /login/request-otp` | Email did not match (silent) | `200` |
| `POST /login/request-otp` | Invalid / unparseable body | `400` |
| `POST /login/request-otp` | Rate limit exceeded | `429` |
| `POST /login/request-otp` | Resend failure | `502` |
| `POST /login/verify-otp` | Code correct, token issued | `200` |
| `POST /login/verify-otp` | Invalid / unparseable body, bad code format | `400` |
| `POST /login/verify-otp` | Email not `ADMIN_EMAIL` | `401` |
| `POST /login/verify-otp` | Wrong code | `401` |
| `POST /login/verify-otp` | Too many attempts | `429` |
| `POST /login/verify-otp` | Code expired / not found | `404` |

---

## One-Time Setup (manual, before deployment)

1. Create [Resend](https://resend.com) account; verify sender domain or use `onboarding@resend.dev` for testing
2. Create KV namespace: `npx wrangler kv namespace create OTP_KV`
3. Add KV binding to `wrangler.toml` **(in the worker repository, not this repo)**:
   ```toml
   [[kv_namespaces]]
   binding = "OTP_KV"
   id = "<namespace-id-from-step-2>"
   ```
4. Set secrets and env vars:
   ```bash
   npx wrangler secret put RESEND_API_KEY
   ```
   Add `RESEND_FROM` as a plain variable in `wrangler.toml` (not a secret — it is not sensitive):
   ```toml
   [vars]
   RESEND_FROM = "noreply@youngsookchoi.com"
   ```
5. Delete old secret: `npx wrangler secret delete ADMIN_PASSWORD`

---

## Files Changed

| File | Repo | Change |
|---|---|---|
| `worker/admin-worker.js` | Worker repo | Remove `handleLogin`; add `handleRequestOtp`, `handleVerifyOtp`; add KV + Resend calls; update routing |
| `wrangler.toml` | Worker repo | Add `OTP_KV` namespace binding |
| `src/lib/admin-api.ts` | This repo | Replace `login()` with `requestOtp()` + `verifyOtp()` |
| `src/app/admin/page.tsx` | This repo | Two-step OTP login form |
