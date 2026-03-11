'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import RichTextEditor from '@/components/admin/RichTextEditor'
import { getContent, putContent } from '@/lib/admin-api'
import type { SiteContent } from '@/lib/admin-api'

export default function EditContact() {
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

  const htmlContent = content
    ? content.contact.paragraphs.map(p => `<p>${p}</p>`).join('')
    : ''

  function handleParaChange(html: string) {
    if (!content) return
    const div = document.createElement('div')
    div.innerHTML = html
    const paragraphs = Array.from(div.querySelectorAll('p')).map(p => p.innerHTML)
    setContent({ ...content, contact: { ...content.contact, paragraphs } })
  }

  async function save() {
    if (!content) return
    setSaving(true)
    try {
      await putContent(content, sha, 'admin: update contact page')
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
        <h1 className="font-sans uppercase tracking-[0.0625em] text-sm">Contact</h1>
        <button onClick={save} disabled={saving} className="bg-black text-white px-5 py-2 text-xs font-sans uppercase tracking-[0.0625em] hover:bg-gray-800 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save & Publish'}
        </button>
      </div>
      {saved && <p className="mb-4 text-xs font-sans text-green-700">Published — live in ~3 minutes.</p>}
      <div className="space-y-6">
        <div>
          <label className="block text-xs font-sans uppercase tracking-[0.0625em] text-gray-500 mb-2">Email</label>
          <input
            type="email"
            value={content.contact.email}
            onChange={e => setContent({ ...content, contact: { ...content.contact, email: e.target.value } })}
            className="w-full border border-gray-300 px-3 py-2 text-sm font-sans focus:outline-none focus:border-black"
          />
        </div>
        <div>
          <label className="block text-xs font-sans uppercase tracking-[0.0625em] text-gray-500 mb-2">Instagram Handle</label>
          <input
            type="text"
            value={content.contact.instagram.handle}
            onChange={e => setContent({ ...content, contact: { ...content.contact, instagram: { ...content.contact.instagram, handle: e.target.value } } })}
            className="w-full border border-gray-300 px-3 py-2 text-sm font-sans focus:outline-none focus:border-black"
          />
        </div>
        <div>
          <label className="block text-xs font-sans uppercase tracking-[0.0625em] text-gray-500 mb-2">Instagram URL</label>
          <input
            type="url"
            value={content.contact.instagram.url}
            onChange={e => setContent({ ...content, contact: { ...content.contact, instagram: { ...content.contact.instagram, url: e.target.value } } })}
            className="w-full border border-gray-300 px-3 py-2 text-sm font-sans focus:outline-none focus:border-black"
          />
        </div>
        <div>
          <label className="block text-xs font-sans uppercase tracking-[0.0625em] text-gray-500 mb-2">Contact Text</label>
          <RichTextEditor content={htmlContent} onChange={handleParaChange} slug="contact" />
        </div>
      </div>
    </AdminLayout>
  )
}
