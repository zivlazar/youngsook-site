import type { SiteContent } from './data'

const WORKER_URL = 'https://youngsook-admin-worker.zivlazar.workers.dev'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('admin_token')
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

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

export async function getContent(): Promise<{ content: SiteContent; sha: string }> {
  const res = await fetch(`${WORKER_URL}/content`, { headers: authHeaders() })
  if (res.status === 401) throw new Error('Unauthorized')
  if (!res.ok) throw new Error('Failed to load content')
  return res.json()
}

export async function putContent(content: SiteContent, sha: string, message: string): Promise<void> {
  const res = await fetch(`${WORKER_URL}/content`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ content, sha, message }),
  })
  if (res.status === 401) throw new Error('Unauthorized')
  if (!res.ok) throw new Error('Failed to save content')
}

export async function uploadImage(filename: string, base64: string): Promise<string> {
  const res = await fetch(`${WORKER_URL}/images`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ filename, base64 }),
  })
  if (!res.ok) throw new Error('Image upload failed')
  const { path } = await res.json()
  return path
}

export async function deleteImage(filename: string): Promise<void> {
  const res = await fetch(`${WORKER_URL}/images/${filename}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Image delete failed')
}

// Re-export types for use in admin components
export type { SiteContent, WorkEntry, ContactData, IntroductionData } from './data'
