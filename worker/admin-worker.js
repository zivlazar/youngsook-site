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

const ALLOWED_ORIGINS = [
  'https://youngsookchoi.com',
  'https://youngsook-site.pages.dev',
  'http://localhost:3000',
]

const CONTENT_PATH = 'src/lib/content.json'

function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  }
  if (ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

function json(data, status = 200, origin = '') {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  })
}

// JWT using Web Crypto (HMAC-SHA256)
async function signJWT(payload, secret) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const data = `${header}.${body}`
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return `${data}.${sigB64}`
}

async function verifyJWT(token, secret) {
  try {
    const [header, body, sig] = token.split('.')
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    )
    const data = `${header}.${body}`
    const sigBytes = Uint8Array.from(atob(sig.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(data))
    if (!valid) return null
    const payload = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')))
    if (payload.exp < Date.now() / 1000) return null
    return payload
  } catch {
    return null
  }
}

async function requireAuth(request, env) {
  const auth = request.headers.get('Authorization') || ''
  if (!auth.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  if (!token) return null
  return verifyJWT(token, env.JWT_SECRET)
}

// GitHub API helpers
async function githubGet(path, env) {
  const res = await fetch(`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`, {
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'youngsook-admin',
    },
  })
  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status}`)
  return res.json()
}

async function githubPut(path, content, sha, message, env) {
  const body = { message, content: btoa(unescape(encodeURIComponent(content))), sha }
  const res = await fetch(`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'youngsook-admin',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`GitHub PUT failed: ${res.status} ${err}`)
  }
  return res.json()
}

async function githubDelete(path, sha, message, env) {
  const res = await fetch(`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'youngsook-admin',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, sha }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`GitHub DELETE failed: ${res.status} ${err}`)
  }
  return res.json()
}

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

// Route handlers
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

async function handleGetContent(request, env, origin) {
  const payload = await requireAuth(request, env)
  if (!payload) return json({ error: 'Unauthorized' }, 401, origin)
  const file = await githubGet(CONTENT_PATH, env)
  const bytes = Uint8Array.from(atob(file.content), c => c.charCodeAt(0))
  const content = JSON.parse(new TextDecoder().decode(bytes))
  return json({ content, sha: file.sha }, 200, origin)
}

async function handlePutContent(request, env, origin) {
  const payload = await requireAuth(request, env)
  if (!payload) return json({ error: 'Unauthorized' }, 401, origin)
  let content, sha, message
  try {
    ;({ content, sha, message } = await request.json())
  } catch {
    return json({ error: 'Invalid request body' }, 400, origin)
  }
  await githubPut(CONTENT_PATH, JSON.stringify(content, null, 2), sha, message || 'admin: update content', env)
  return json({ ok: true }, 200, origin)
}

async function handleUploadImage(request, env, origin) {
  const payload = await requireAuth(request, env)
  if (!payload) return json({ error: 'Unauthorized' }, 401, origin)
  let filename, base64, sha
  try {
    ;({ filename, base64, sha } = await request.json())
  } catch {
    return json({ error: 'Invalid request body' }, 400, origin)
  }
  // validate filename — no path traversal
  if (!filename || !/^[a-zA-Z0-9_\-\.]+$/.test(filename)) {
    return json({ error: 'Invalid filename' }, 400, origin)
  }
  if (!base64 || base64.length > 10_000_000) {
    return json({ error: 'Image too large (max ~7.5 MB)' }, 400, origin)
  }
  const path = `public/images/${filename}`
  // Fetch existing SHA if file already exists (required by GitHub API for updates)
  let existingSha = sha
  if (!existingSha) {
    try {
      const existing = await githubGet(path, env)
      existingSha = existing.sha
    } catch {
      // File doesn't exist yet — no SHA needed
    }
  }
  const body = { message: `admin: upload ${filename}`, content: base64 }
  if (existingSha) body.sha = existingSha
  const res = await fetch(`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'youngsook-admin',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    return json({ error: `Upload failed: ${err}` }, 500, origin)
  }
  return json({ path: `/images/${filename}` }, 200, origin)
}

async function handleDeleteImage(request, env, origin) {
  const payload = await requireAuth(request, env)
  if (!payload) return json({ error: 'Unauthorized' }, 401, origin)
  const url = new URL(request.url)
  const filename = url.pathname.split('/images/')[1]
  // validate filename
  if (!filename || !/^[a-zA-Z0-9_\-\.]+$/.test(filename)) {
    return json({ error: 'Invalid filename' }, 400, origin)
  }
  const path = `public/images/${filename}`
  try {
    const file = await githubGet(path, env)
    await githubDelete(path, file.sha, `admin: delete ${filename}`, env)
    return json({ ok: true }, 200, origin)
  } catch (e) {
    return json({ error: e.message }, 500, origin)
  }
}

const worker = {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }
    const url = new URL(request.url)
    const path = url.pathname

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
  },
}

export default worker
