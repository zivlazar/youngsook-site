# Admin OTP Login — Design Spec

**Date:** 2026-03-12
**Status:** Approved

## Overview

Replace the current email + password admin login with a passwordless 6-digit OTP flow. When the admin navigates to `/admin`, they enter their email address, receive a one-time code via Resend, and paste it into the login page to obtain a JWT session.

---

## User Flow

1. Admin visits `/admin`
2. Enters email address → clicks "Send Code"
3. Worker validates email silently (no error if wrong — prevents probing)
4. If email matches `ADMIN_EMAIL`: generate 6-digit code, store in KV with 10-minute TTL, send via Resend
5. Page transitions to Step 2: code entry
6. Admin copies code from email → pastes into 6-digit input → clicks "Verify"
7. On success: JWT stored in `localStorage`, redirect to `/admin/dashboard`
8. On wrong code: error shown, retry allowed (up to 5 attempts before code is invalidated)
9. "Resend code" link available after a 30-second cooldown

---

## Worker Changes

### New endpoints (replace `POST /login`)

#### `POST /login/request-otp`
- Body: `{ email: string }`
- Validates email against `env.ADMIN_EMAIL` — silently no-ops if mismatch
- Rate limit: max 3 requests per 15 minutes per email (KV key: `otp_rate:{email}`, TTL 15 min)
- Generates a cryptographically random 6-digit code (`crypto.getRandomValues`)
- Stores in KV: key `otp:{email}`, value `{ code, attempts: 0 }`, TTL 600 seconds (10 minutes)
- Calls Resend API to send the code
- Always returns `{ ok: true }` regardless of whether email matched

#### `POST /login/verify-otp`
- Body: `{ email: string, code: string }`
- Looks up `otp:{email}` in KV; if missing → `{ error: "Code expired or not found" }`
- If `attempts >= 5` → delete KV entry, return `{ error: "Too many attempts, request a new code" }`
- If code mismatch → increment `attempts`, save back, return `{ error: "Invalid code" }`
- If code matches → delete KV entry, issue JWT (HS256, 24h expiry, same as before), return `{ token }`

### Removed
- `POST /login` (password-based login) is deleted
- `ADMIN_PASSWORD` env var is removed

### New env vars / bindings
| Name | Type | Description |
|---|---|---|
| `OTP_KV` | KV namespace binding | Stores OTP entries and rate-limit counters |
| `RESEND_API_KEY` | Secret | Resend API key |
| `RESEND_FROM` | Secret | Verified sender address (e.g. `noreply@youngsookchoi.com`) |

---

## Frontend Changes

### `src/lib/admin-api.ts`
Remove `login(email, password)`. Add:
- `requestOtp(email: string): Promise<void>` — calls `POST /login/request-otp`
- `verifyOtp(email: string, code: string): Promise<string>` — calls `POST /login/verify-otp`, returns JWT

### `src/app/admin/page.tsx`
Two-step form, single component, no new files.

**State:**
- `step: 'email' | 'code'`
- `email: string`
- `code: string`
- `error: string`
- `loading: boolean`
- `resendCooldown: number` (seconds remaining, counts down from 30)

**Step 1 — Email input:**
- Email field + "Send Code" button
- On submit: call `requestOtp(email)` → transition to step `'code'`, start 30s cooldown timer

**Step 2 — Code input:**
- "Code sent to {email}" message
- Text input, `inputMode="numeric"`, `maxLength={6}`, auto-focused
- "Verify" button
- "Resend code" link — disabled until cooldown reaches 0; clicking resets cooldown and calls `requestOtp` again
- On submit: call `verifyOtp(email, code)` → store JWT in `localStorage` → redirect to `/admin/dashboard`

---

## Security Properties

| Property | Detail |
|---|---|
| No password to steal | Credentials are not stored anywhere |
| Code expiry | 10 minutes via KV TTL |
| Brute-force protection | Max 5 wrong attempts before code is invalidated |
| Email spam protection | Max 3 OTP requests per 15 minutes |
| No info leakage | `request-otp` always returns `{ ok: true }` |
| Code entropy | 6 digits = 1,000,000 combinations; with 5-attempt limit = 0.0005% max success chance |

---

## One-Time Setup (manual, before deployment)

1. Create [Resend](https://resend.com) account; verify sender domain or use `onboarding@resend.dev` for testing
2. Create KV namespace: `npx wrangler kv namespace create OTP_KV`
3. Add KV binding to `wrangler.toml`:
   ```toml
   [[kv_namespaces]]
   binding = "OTP_KV"
   id = "<namespace-id-from-step-2>"
   ```
4. Set secrets:
   ```bash
   npx wrangler secret put RESEND_API_KEY
   npx wrangler secret put RESEND_FROM
   ```
5. Delete old secret: `npx wrangler secret delete ADMIN_PASSWORD`

---

## Files Changed

| File | Change |
|---|---|
| `worker/admin-worker.js` | Remove `handleLogin`; add `handleRequestOtp`, `handleVerifyOtp`; add KV + Resend calls; update routing |
| `src/lib/admin-api.ts` | Replace `login()` with `requestOtp()` + `verifyOtp()` |
| `src/app/admin/page.tsx` | Two-step OTP login form |
| `wrangler.toml` | Add `OTP_KV` namespace binding |
