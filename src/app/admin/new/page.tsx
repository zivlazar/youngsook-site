'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import RichTextEditor from '@/components/admin/RichTextEditor'
import ImageUpload from '@/components/admin/ImageUpload'
import { getContent, putContent } from '@/lib/admin-api'
import type { SiteContent, WorkEntry } from '@/lib/admin-api'

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function NewPageForm() {
  const router = useRouter()
  const params = useSearchParams()
  const type = (params.get('type') || 'works') as 'works' | 'archives'

  const [content, setContent] = useState<SiteContent | null>(null)
  const [sha, setSha] = useState('')
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [heroSrc, setHeroSrc] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getContent()
      .then(({ content, sha }) => { setContent(content); setSha(sha) })
      .catch(() => router.replace('/admin'))
      .finally(() => setLoading(false))
  }, [router])

  function handleTitleChange(t: string) {
    setTitle(t)
    setSlug(slugify(t))
  }

  async function save() {
    if (!content || !title || !slug || !heroSrc) {
      alert('Title, slug, and hero image are required.')
      return
    }
    if (content[type].some((e: WorkEntry) => e.slug === slug)) {
      alert(`Slug "${slug}" already exists. Please use a different title.`)
      return
    }
    const newEntry: WorkEntry = {
      slug,
      title,
      category: type,
      content: [body],
      images: [{ src: heroSrc, alt: '' }],
    }
    const updated: SiteContent = {
      ...content,
      [type]: [...content[type], newEntry],
    }
    setSaving(true)
    try {
      await putContent(updated, sha, `admin: add ${title}`)
      router.replace('/admin/dashboard')
    } catch (e) {
      alert('Save failed: ' + (e as Error).message)
      setSaving(false)
    }
  }

  if (loading || !content) return <AdminLayout><p className="text-sm font-sans text-gray-500">Loading…</p></AdminLayout>

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-sans uppercase tracking-[0.0625em] text-sm">
          New {type === 'works' ? 'Work' : 'Archive'}
        </h1>
        <div className="flex gap-2">
          <button onClick={() => router.back()} disabled={saving} className="px-5 py-2 text-xs font-sans uppercase tracking-[0.0625em] border border-gray-300 hover:border-black disabled:opacity-50">
            Cancel
          </button>
          <button onClick={save} disabled={saving} className="bg-black text-white px-5 py-2 text-xs font-sans uppercase tracking-[0.0625em] hover:bg-gray-800 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save & Publish'}
          </button>
        </div>
      </div>
      <div className="space-y-8">
        <div>
          <label className="block text-xs font-sans uppercase tracking-[0.0625em] text-gray-500 mb-2">Title</label>
          <input
            type="text"
            value={title}
            onChange={e => handleTitleChange(e.target.value)}
            className="w-full border border-gray-300 px-3 py-2 text-sm font-sans focus:outline-none focus:border-black"
            placeholder="Page title"
          />
        </div>
        <div>
          <label className="block text-xs font-sans uppercase tracking-[0.0625em] text-gray-500 mb-2">Slug (URL)</label>
          <input
            type="text"
            value={slug}
            onChange={e => setSlug(e.target.value)}
            className="w-full border border-gray-300 px-3 py-2 text-sm font-sans focus:outline-none focus:border-black font-mono"
            placeholder="page-url-slug"
          />
          <p className="mt-1 text-xs font-sans text-gray-400">Will be accessible at /{type}/{slug}</p>
        </div>
        <div>
          <label className="block text-xs font-sans uppercase tracking-[0.0625em] text-gray-500 mb-2">
            Hero Image <span className="text-red-500">*</span>
          </label>
          <ImageUpload
            currentSrc={heroSrc}
            slug={slug || 'new'}
            onUpload={setHeroSrc}
          />
        </div>
        <div>
          <label className="block text-xs font-sans uppercase tracking-[0.0625em] text-gray-500 mb-2">Content</label>
          <RichTextEditor content={body} onChange={setBody} slug={slug || 'new'} />
        </div>
      </div>
    </AdminLayout>
  )
}

export default function NewPage() {
  return <Suspense fallback={null}><NewPageForm /></Suspense>
}
