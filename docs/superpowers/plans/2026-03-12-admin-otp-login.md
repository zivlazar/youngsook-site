# Admin OTP Login Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace email+password admin login with a passwordless 6-digit OTP flow using Resend and Cloudflare KV.

**Architecture:** The Cloudflare Worker (`worker/admin-worker.js`) gains two new endpoints — `POST /login/request-otp` (generates & emails a code) and `POST /login/verify-otp` (validates it and issues a JWT). The old `POST /login` is removed. The Next.js login page becomes a two-step form: email → then code.

**Tech Stack:** Cloudflare Workers, Cloudflare KV, Resend API, Next.js (App Router, static export), TypeScript, Wrangler CLI

**Spec:** `docs/superpowers/specs/2026-03-12-admin-otp-login-design.md`

---

## Chunk 1: Infrastructure Setup + Worker Changes

### Task 1: One-time infrastructure setup

**Files:**
- Modify: `wrangler-admin.toml`
- Create: `worker/.dev.vars` (gitignored — local secrets for wrangler dev)

> **Prerequisites before running any code:** complete these manual steps first.

- [ ] **Step 1: Create a Resend account and get an API key**

  Go to https://resend.com → sign up → API Keys → Create API Key.

  For a verified sender domain: Domains → Add Domain → follow DNS setup for `youngsookchoi.com`.

  For quick testing without DNS setup, use `onboarding@resend.dev` as the FROM address (Resend's sandbox — can only send to the account owner's email).

- [ ] **Step 2: Create the Cloudflare KV namespace**

  ```bash
  npx wrangler kv namespace create OTP_KV --config wrangler-admin.toml
  ```

  Note the `id` value from the output — you'll need it in the next step.

- [ ] **Step 3: Update `wrangler-admin.toml` with the KV binding and RESEND_FROM**

  Open `wrangler-admin.toml` and add:

  ```toml
  [[kv_namespaces]]
  binding = "OTP_KV"
  id = "<paste-id-from-step-2>"

  [vars]
  RESEND_FROM = "noreply@youngsookchoi.com"
  ```

  (Replace `noreply@youngsookchoi.com` with your verified sender address, or `onboarding@resend.dev` for testing.)

- [ ] **Step 4: Create `worker/.dev.vars` for local development**

  Create the file `worker/.dev.vars` (wrangler reads this for local `wrangler dev` secrets):

  ```
  RESEND_API_KEY=re_your_actual_resend_api_key_here
  ADMIN_EMAIL=your@email.com
  JWT_SECRET=your-existing-jwt-secret
  GITHUB_TOKEN=your-existing-github-token
  GITHUB_OWNER=zivlazar
  GITHUB_REPO=youngsook-site
  ```

  **Important:** Add `worker/.dev.vars` to `.gitignore` by opening `.gitignore` and adding a new line:

  ```
  worker/.dev.vars
  ```

- [ ] **Step 5: Set the RESEND_API_KEY secret on the deployed worker**

  ```bash
  npx wrangler secret put RESEND_API_KEY --config wrangler-admin.toml
  ```

  Paste your Resend API key when prompted.

- [ ] **Step 6: Commit the wrangler-admin.toml changes**

  ```bash
  git add wrangler-admin.toml .gitignore
  git commit -m "chore: add OTP_KV binding and RESEND_FROM to wrangler-admin.toml"
  ```

---

### Task 2: Add `sendOtpEmail` helper and `handleRequestOtp` to the worker

**Files:**
- Modify: `worker/admin-worker.js` (add after `githubDelete` function, before `handleLogin`)

- [ ] **Step 1: Add the `sendOtpEmail` helper function**

  In `worker/admin-worker.js`, after the `githubDelete` function (line ~134), add:

  ```javascript
  // Resend email helper
  async function sendOtpEmail(to, code, env) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.RESEND_FROM,
        to: [to],
        subject: 'Your admin login code',
        text: `Your login code is: ${code}\n\nThis code expires in 10 minutes. Do not share it.`,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Resend failed: ${res.status} ${err}`)
    }
  }
  ```

- [ ] **Step 2: Add the `handleRequestOtp` handler function**

  Immediately after `sendOtpEmail`, add:

  ```javascript
  async function handleRequestOtp(request, env, origin) {
    let email
    try {
      ;({ email } = await request.json())
    } catch {
      return json({ error: 'Invalid request' }, 400, origin)
    }

    // Validate: email must be a non-empty string
    if (typeof email !== 'string' || !email) {
      return json({ error: 'Invalid request' }, 400, origin)
    }
    const normalised = email.toLowerCase().trim()
    if (!normalised) return json({ error: 'Invalid request' }, 400, origin)

    // Rate limit: max 3 requests per 15-minute FIXED window.
    // Use getWithMetadata so we can preserve the original window's TTL on each increment.
    const rateLimitKey = `otp_rate:${normalised}`
    const { value: rateCountStr, metadata: rateMeta } =
      await env.OTP_KV.getWithMetadata(rateLimitKey, 'text')
    const rateCount = rateCountStr ? parseInt(rateCountStr, 10) : 0
    if (rateCount >= 3) {
      return json({ error: 'Too many requests' }, 429, origin)
    }

    // Silent no-op for unrecognised email — prevents probing
    if (normalised !== env.ADMIN_EMAIL.toLowerCase()) {
      return json({ ok: true }, 200, origin)
    }

    // Generate cryptographically random 6-digit code
    const digits = new Uint32Array(1)
    crypto.getRandomValues(digits)
    const code = String(digits[0] % 1_000_000).padStart(6, '0')

    // Send email BEFORE writing KV — do not increment counter if send fails
    try {
      await sendOtpEmail(normalised, code, env)
    } catch {
      return json({ error: 'Failed to send email' }, 502, origin)
    }

    // Store OTP in KV with explicit expiration in metadata (needed for TTL preservation on verify)
    const otpExpiration = Math.floor(Date.now() / 1000) + 600
    await env.OTP_KV.put(
      `otp:${normalised}`,
      JSON.stringify({ code, attempts: 0 }),
      { expirationTtl: 600, metadata: { expiration: otpExpiration } }
    )

    // Increment rate limit counter only after successful send.
    // Fixed window: set TTL only on first creation; preserve the original window on increments.
    if (rateCount === 0) {
      const rateExpiration = Math.floor(Date.now() / 1000) + 900
      await env.OTP_KV.put(rateLimitKey, '1', {
        expirationTtl: 900,
        metadata: { expiration: rateExpiration },
      })
    } else {
      const rateRemainingTtl = Math.max(1, Math.floor(rateMeta.expiration - Date.now() / 1000))
      await env.OTP_KV.put(rateLimitKey, String(rateCount + 1), {
        expirationTtl: rateRemainingTtl,
        metadata: rateMeta,
      })
    }

    return json({ ok: true }, 200, origin)
  }
  ```

- [ ] **Step 3: Start the local worker and test `request-otp`**

  In one terminal:
  ```bash
  npx wrangler dev --config wrangler-admin.toml --local
  ```
  Expected: `Ready on http://localhost:8787`

  In another terminal — test with wrong email (should return 200 silently):
  ```bash
  curl -s -X POST http://localhost:8787/login/request-otp \
    -H "Content-Type: application/json" \
    -d '{"email":"wrong@example.com"}' | python3 -m json.tool
  ```
  Expected: `{"ok": true}`

  Test with missing body (should 400):
  ```bash
  curl -s -X POST http://localhost:8787/login/request-otp \
    -H "Content-Type: application/json" \
    -d 'notjson' | python3 -m json.tool
  ```
  Expected: `{"error": "Invalid request"}`

  Test with correct email (should actually send email and return 200):
  ```bash
  curl -s -X POST http://localhost:8787/login/request-otp \
    -H "Content-Type: application/json" \
    -d '{"email":"YOUR_ADMIN_EMAIL"}' | python3 -m json.tool
  ```
  Expected: `{"ok": true}` — and you should receive the email.

  > Note: `--local` uses in-memory KV. The code is stored but you can't easily inspect it. We'll verify full flow after `handleVerifyOtp` is added.

- [ ] **Step 4: Commit**

  ```bash
  git add worker/admin-worker.js
  git commit -m "feat(worker): add sendOtpEmail helper and handleRequestOtp endpoint"
  ```

---

### Task 3: Add `handleVerifyOtp`, update routing, remove `handleLogin`

**Files:**
- Modify: `worker/admin-worker.js`

- [ ] **Step 1: Add the `handleVerifyOtp` handler**

  After `handleRequestOtp`, add:

  ```javascript
  async function handleVerifyOtp(request, env, origin) {
    let email, code
    try {
      ;({ email, code } = await request.json())
    } catch {
      return json({ error: 'Invalid request' }, 400, origin)
    }

    // Validate types before any processing
    if (typeof email !== 'string' || typeof code !== 'string') {
      return json({ error: 'Invalid request' }, 400, origin)
    }
    const normalised = email.toLowerCase().trim()
    // Validate: email present, code is exactly 6 digits
    if (!normalised || !/^\d{6}$/.test(code)) {
      return json({ error: 'Invalid request' }, 400, origin)
    }

    // Defence-in-depth: confirm email is the admin email before touching KV
    if (normalised !== env.ADMIN_EMAIL.toLowerCase()) {
      return json({ error: 'Unauthorized' }, 401, origin)
    }

    const { value, metadata } = await env.OTP_KV.getWithMetadata(`otp:${normalised}`, 'json')

    if (!value) {
      return json({ error: 'Code expired or not found' }, 404, origin)
    }

    const { code: storedCode, attempts } = value

    // Attempt boundary: attempts 0–4 reach code comparison (5 chances).
    // On the 6th call (attempts === 5), the gate fires.
    if (attempts >= 5) {
      await env.OTP_KV.delete(`otp:${normalised}`)
      return json({ error: 'Too many attempts, request a new code' }, 429, origin)
    }

    if (code !== storedCode) {
      // Preserve original expiry window — do not reset the 10-minute clock
      const remainingTtl = Math.max(1, Math.floor(metadata.expiration - Date.now() / 1000))
      await env.OTP_KV.put(
        `otp:${normalised}`,
        JSON.stringify({ code: storedCode, attempts: attempts + 1 }),
        { expirationTtl: remainingTtl, metadata }
      )
      return json({ error: 'Invalid code' }, 401, origin)
    }

    // Code correct — delete entry and issue JWT
    await env.OTP_KV.delete(`otp:${normalised}`)
    const token = await signJWT(
      { sub: normalised, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 },
      env.JWT_SECRET
    )
    return json({ token }, 200, origin)
  }
  ```

- [ ] **Step 2: Update the router and remove `handleLogin`**

  Find the `worker.fetch` routing block near the bottom of `worker/admin-worker.js`:

  ```javascript
  // OLD — replace this entire try block:
  try {
    if (path === '/login' && request.method === 'POST') return handleLogin(request, env, origin)
    if (path === '/content' && request.method === 'GET') return handleGetContent(request, env, origin)
    if (path === '/content' && request.method === 'PUT') return handlePutContent(request, env, origin)
    if (path === '/images' && request.method === 'POST') return handleUploadImage(request, env, origin)
    if (path.startsWith('/images/') && request.method === 'DELETE') return handleDeleteImage(request, env, origin)
    return json({ error: 'Not found' }, 404, origin)
  } catch (e) {
    return json({ error: e.message }, 500, origin)
  }
  ```

  Replace with:

  ```javascript
  try {
    if (path === '/login/request-otp' && request.method === 'POST') return handleRequestOtp(request, env, origin)
    if (path === '/login/verify-otp' && request.method === 'POST') return handleVerifyOtp(request, env, origin)
    if (path === '/content' && request.method === 'GET') return handleGetContent(request, env, origin)
    if (path === '/content' && request.method === 'PUT') return handlePutContent(request, env, origin)
    if (path === '/images' && request.method === 'POST') return handleUploadImage(request, env, origin)
    if (path.startsWith('/images/') && request.method === 'DELETE') return handleDeleteImage(request, env, origin)
    return json({ error: 'Not found' }, 404, origin)
  } catch (e) {
    return json({ error: e.message }, 500, origin)
  }
  ```

- [ ] **Step 3: Delete the `handleLogin` function and update the header comment**

  Delete the entire `handleLogin` function (lines ~137–152).

  Update the secrets comment at the top of `worker/admin-worker.js`:

  ```javascript
  // worker/admin-worker.js
  // Secrets required (set via: wrangler secret put <NAME> --config wrangler-admin.toml):
  //   ADMIN_EMAIL      - admin email address (receives OTP codes)
  //   RESEND_API_KEY   - Resend API key for sending OTP emails
  //   GITHUB_TOKEN     - GitHub personal access token (repo scope)
  //   JWT_SECRET       - random 32+ char string for signing JWTs
  //   GITHUB_OWNER     - GitHub username/org (e.g. "zivlazar")
  //   GITHUB_REPO      - repo name (e.g. "youngsook-site")
  //
  // KV namespace binding required (set in wrangler-admin.toml):
  //   OTP_KV           - Cloudflare KV namespace for OTP + rate-limit entries
  //
  // Plain vars (set in wrangler-admin.toml [vars]):
  //   RESEND_FROM      - verified sender address (e.g. "noreply@youngsookchoi.com")
  ```

- [ ] **Step 4: Verify the full OTP flow locally**

  Start the worker:
  ```bash
  npx wrangler dev --config wrangler-admin.toml --local
  ```

  Request a code:
  ```bash
  curl -s -X POST http://localhost:8787/login/request-otp \
    -H "Content-Type: application/json" \
    -d '{"email":"YOUR_ADMIN_EMAIL"}' | python3 -m json.tool
  ```
  Expected: `{"ok": true}` — check your email for the 6-digit code.

  Verify with wrong code (should 401):
  ```bash
  curl -s -X POST http://localhost:8787/login/verify-otp \
    -H "Content-Type: application/json" \
    -d '{"email":"YOUR_ADMIN_EMAIL","code":"000000"}' | python3 -m json.tool
  ```
  Expected: `{"error": "Invalid code"}`

  Verify with correct code from email (should 200 + token):
  ```bash
  curl -s -X POST http://localhost:8787/login/verify-otp \
    -H "Content-Type: application/json" \
    -d '{"email":"YOUR_ADMIN_EMAIL","code":"XXXXXX"}' | python3 -m json.tool
  ```
  Expected: `{"token": "eyJ..."}`

  Verify the old `/login` endpoint is gone (should 404):
  ```bash
  curl -s -X POST http://localhost:8787/login \
    -H "Content-Type: application/json" \
    -d '{"email":"x","password":"y"}' | python3 -m json.tool
  ```
  Expected: `{"error": "Not found"}`

- [ ] **Step 5: Deploy the worker**

  > **Note:** After this step the old `POST /login` endpoint is gone on the live worker but the frontend still calls it until the frontend changes (Chunk 2) are deployed. Complete Chunk 2 and push immediately after deploying the worker, or do both in a single session.

  ```bash
  npx wrangler deploy --config wrangler-admin.toml
  ```
  Expected: `Deployed youngsook-admin-worker`

  Repeat the verify tests against the production URL to confirm:
  ```bash
  curl -s -X POST https://youngsook-admin-worker.zivlazar.workers.dev/login/request-otp \
    -H "Content-Type: application/json" \
    -d '{"email":"YOUR_ADMIN_EMAIL"}' | python3 -m json.tool
  ```

- [ ] **Step 6: Remove the ADMIN_PASSWORD secret**

  ```bash
  npx wrangler secret delete ADMIN_PASSWORD --config wrangler-admin.toml
  ```

- [ ] **Step 7: Commit**

  ```bash
  git add worker/admin-worker.js
  git commit -m "feat(worker): add handleVerifyOtp, update routing, remove password-based login"
  ```

---

## Chunk 2: Frontend Changes

> **Build continuity:** Once Task 4 removes `login()`, the existing `admin/page.tsx` will have a broken import. Complete and push both Task 4 and Task 5 in the same session without a deploy in between.

### Task 4: Update `src/lib/admin-api.ts`

**Files:**
- Modify: `src/lib/admin-api.ts`

- [ ] **Step 1: Replace `login()` with `requestOtp()` and `verifyOtp()`**

  Open `src/lib/admin-api.ts`. Replace the `login` function:

  ```typescript
  // DELETE this function:
  export async function login(email: string, password: string): Promise<string> {
    const res = await fetch(`${WORKER_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) throw new Error('Invalid credentials')
    const { token } = await res.json()
    return token
  }
  ```

  Add these two functions in its place:

  ```typescript
  export async function requestOtp(email: string): Promise<void> {
    const res = await fetch(`${WORKER_URL}/login/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error((body as { error?: string }).error || 'Failed to send code')
    }
  }

  export async function verifyOtp(email: string, code: string): Promise<string> {
    const res = await fetch(`${WORKER_URL}/login/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error((body as { error?: string }).error || 'Verification failed')
    }
    const { token } = await res.json()
    return token
  }
  ```

- [ ] **Step 2: Verify no TypeScript errors**

  ```bash
  npm run build
  ```
  Expected: build succeeds with no errors.

  > If you see "login is not exported" errors from any file — those callers will be fixed in the next task.

- [ ] **Step 3: Commit**

  ```bash
  git add src/lib/admin-api.ts
  git commit -m "feat: replace login() with requestOtp() + verifyOtp() in admin-api"
  ```

---

### Task 5: Rewrite `src/app/admin/page.tsx`

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Rewrite the login page with the two-step OTP form**

  Replace the entire contents of `src/app/admin/page.tsx` with:

  ```tsx
  'use client'

  import { useState, useEffect, useRef } from 'react'
  import { useRouter } from 'next/navigation'
  import { requestOtp, verifyOtp } from '@/lib/admin-api'

  export default function AdminLogin() {
    const router = useRouter()
    const [step, setStep] = useState<'email' | 'code'>('email')
    const [email, setEmail] = useState('')
    const [code, setCode] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [resendCooldown, setResendCooldown] = useState(0)
    const codeInputRef = useRef<HTMLInputElement>(null)

    // Auto-focus the code input when step changes to 'code'
    useEffect(() => {
      if (step === 'code') codeInputRef.current?.focus()
    }, [step])

    // Count down the resend cooldown timer
    useEffect(() => {
      if (resendCooldown <= 0) return
      const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000)
      return () => clearTimeout(timer)
    }, [resendCooldown])

    async function handleRequestOtp(e: React.FormEvent) {
      e.preventDefault()
      setLoading(true)
      setError('')
      try {
        await requestOtp(email)
        setStep('code')
        setResendCooldown(30)
      } catch (err) {
        setError((err as Error).message)
        // Cooldown timer is NOT started on error
      } finally {
        setLoading(false)
      }
    }

    async function handleVerifyOtp(e: React.FormEvent) {
      e.preventDefault()
      setLoading(true)
      setError('')
      try {
        const token = await verifyOtp(email, code)
        localStorage.setItem('admin_token', token)
        router.replace('/admin/dashboard')
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    async function handleResend() {
      setError('')
      setLoading(true)
      try {
        await requestOtp(email)
        setResendCooldown(30)
        setCode('')
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    function handleChangeEmail() {
      setStep('email')
      setCode('')
      setError('')
      setResendCooldown(0)
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white border border-gray-200 p-10 w-full max-w-sm">
          <h1 className="font-sans uppercase tracking-[0.0625em] text-sm mb-8 text-center">
            Admin Login
          </h1>

          {step === 'email' ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 px-3 py-2 text-sm font-sans focus:outline-none focus:border-black"
              />
              {error && <p className="text-red-600 text-xs font-sans">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white py-2 text-sm font-sans uppercase tracking-[0.0625em] hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-xs font-sans text-gray-500 text-center">
                Code sent to {email}
              </p>
              <input
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                required
                className="w-full border border-gray-300 px-3 py-2 text-sm font-sans text-center tracking-widest focus:outline-none focus:border-black"
              />
              {error && <p className="text-red-600 text-xs font-sans">{error}</p>}
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full bg-black text-white py-2 text-sm font-sans uppercase tracking-[0.0625em] hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? 'Verifying…' : 'Verify'}
              </button>
              <div className="flex justify-between text-xs font-sans text-gray-500">
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  className="hover:underline"
                >
                  Use a different email
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                  className="hover:underline disabled:opacity-40 disabled:cursor-default"
                >
                  {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend code'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify the build passes with no TypeScript errors**

  ```bash
  npm run build
  ```
  Expected: build succeeds, no TypeScript errors, no ESLint errors.

- [ ] **Step 3: Manually test the login flow in the browser**

  ```bash
  npm run dev
  ```

  Open http://localhost:3000/admin and verify:

  1. Step 1 shows email field + "Send Code" button
  2. Enter a wrong email → click Send Code → no error shown (silent)
  3. Enter the correct admin email → click Send Code → transitions to Step 2 with "Code sent to [email]" message
  4. The resend button shows a 30-second countdown
  5. Enter a wrong 6-digit code → click Verify → "Invalid code" error shown
  6. Click "Use a different email" → returns to Step 1 with cleared state
  7. Go through the flow again and enter the correct code → redirects to `/admin/dashboard`
  8. After the 30s cooldown, the "Resend code" link becomes active; clicking it sends a new code and resets the countdown

- [ ] **Step 4: Commit**

  ```bash
  git add src/app/admin/page.tsx
  git commit -m "feat: two-step OTP login form — replace password with email code"
  ```

- [ ] **Step 5: Push to deploy**

  ```bash
  git push
  ```

  Wait ~1 minute for Cloudflare Pages to deploy, then test the full flow at https://youngsookchoi.com/admin.
