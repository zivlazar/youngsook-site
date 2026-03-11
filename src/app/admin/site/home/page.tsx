'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import ImageUpload from '@/components/admin/ImageUpload'
import { getContent, putContent } from '@/lib/admin-api'
import type { SiteContent } from '@/lib/admin-api'

export default function EditHome() {
  const router = useRouter()
  const [content, setContent] = useState<SiteContent | null>(null)
  const [sha, setSha] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getContent()
      .then(({ content, sha }) => { setContent(content); setSha(sha) })
      .catch(() => router.replace('/admin'))
      .finally(() => setLoading(false))
  }, [router])

  async function save() {
    if (!content) return
    setSaving(true)
    try {
      await putContent(content, sha, 'admin: update home hero image')
      const fresh = await getContent()
      setSha(fresh.sha)
      setSaved(true)
      setTimeout(() => setSaved(false), 5000)
    } catch (e) {
      alert('Save failed: ' + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading || !content) return <AdminLayout><p className="text-sm font-sans text-gray-500">Loading…</p></AdminLayout>

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-sans uppercase tracking-[0.0625em] text-sm">Home — Hero Image</h1>
        <button onClick={save} disabled={saving} className="bg-black text-white px-5 py-2 text-xs font-sans uppercase tracking-[0.0625em] hover:bg-gray-800 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save & Publish'}
        </button>
      </div>
      {saved && <p className="mb-4 text-xs font-sans text-green-700">Published — live in ~3 minutes.</p>}
      <ImageUpload
        currentSrc={content.homeHero}
        slug="hero"
        onUpload={path => setContent({ ...content, homeHero: path })}
      />
    </AdminLayout>
  )
}
