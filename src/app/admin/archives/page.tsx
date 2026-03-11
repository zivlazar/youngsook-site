'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import RichTextEditor from '@/components/admin/RichTextEditor'
import ImageUpload from '@/components/admin/ImageUpload'
import { getContent, putContent } from '@/lib/admin-api'
import type { SiteContent, WorkEntry } from '@/lib/admin-api'

function ArchiveEditor() {
  const router = useRouter()
  const params = useSearchParams()
  const slug = params.get('slug') || ''

  const [content, setContent] = useState<SiteContent | null>(null)
  const [sha, setSha] = useState('')
  const [work, setWork] = useState<WorkEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!slug) { router.replace('/admin/dashboard'); return }
    getContent()
      .then(({ content, sha }) => {
        setContent(content)
        setSha(sha)
        const found = content.archives.find((w: WorkEntry) => w.slug === slug)
        if (!found) router.replace('/admin/dashboard')
        else setWork({ ...found })
      })
      .catch(() => router.replace('/admin'))
      .finally(() => setLoading(false))
  }, [slug, router])

  function updateWork(patch: Partial<WorkEntry>) {
    if (!work) return
    setWork({ ...work, ...patch })
  }

  async function save() {
    if (!content || !work) return
    const updated: SiteContent = {
      ...content,
      archives: content.archives.map((w: WorkEntry) => w.slug === slug ? work : w),
    }
    setSaving(true)
    try {
      await putContent(updated, sha, `admin: update ${work.title}`)
      setContent(updated)
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

  if (loading || !work) return <AdminLayout><p className="text-sm font-sans text-gray-500">Loading…</p></AdminLayout>

  const htmlContent = work.content.join('')

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-sans uppercase tracking-[0.0625em] text-sm">Edit Archive</h1>
        <button onClick={save} disabled={saving} className="bg-black text-white px-5 py-2 text-xs font-sans uppercase tracking-[0.0625em] hover:bg-gray-800 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save & Publish'}
        </button>
      </div>
      {saved && <p className="mb-4 text-xs font-sans text-green-700">Published — live in ~3 minutes.</p>}
      <div className="space-y-8">
        <div>
          <label className="block text-xs font-sans uppercase tracking-[0.0625em] text-gray-500 mb-2">Title</label>
          <input
            type="text"
            value={work.title}
            onChange={e => updateWork({ title: e.target.value })}
            className="w-full border border-gray-300 px-3 py-2 text-sm font-sans focus:outline-none focus:border-black"
          />
        </div>
        <div>
          <label className="block text-xs font-sans uppercase tracking-[0.0625em] text-gray-500 mb-2">Hero Image</label>
          <ImageUpload
            currentSrc={work.images[0]?.src || ''}
            slug={slug}
            onUpload={path => updateWork({ images: [{ src: path, alt: '' }, ...work.images.slice(1)] })}
          />
        </div>
        <div>
          <label className="block text-xs font-sans uppercase tracking-[0.0625em] text-gray-500 mb-2">Content</label>
          <RichTextEditor
            content={htmlContent}
            onChange={html => updateWork({ content: [html] })}
            slug={slug}
          />
        </div>
      </div>
    </AdminLayout>
  )
}

export default function ArchiveEditorPage() {
  return <Suspense fallback={null}><ArchiveEditor /></Suspense>
}
