'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/admin/AdminLayout'
import { getContent, putContent } from '@/lib/admin-api'
import type { SiteContent, WorkEntry } from '@/lib/admin-api'

export default function Dashboard() {
  const router = useRouter()
  const [content, setContent] = useState<SiteContent | null>(null)
  const [sha, setSha] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [published, setPublished] = useState(false)

  useEffect(() => {
    getContent()
      .then(({ content, sha }) => { setContent(content); setSha(sha) })
      .catch(e => {
        if (e.message === 'Unauthorized') router.replace('/admin')
        else setError(e.message)
      })
      .finally(() => setLoading(false))
  }, [router])

  async function deletePage(type: 'works' | 'archives', slug: string) {
    if (!content || !window.confirm(`Delete "${slug}"? This cannot be undone.`)) return
    const updated = {
      ...content,
      [type]: content[type].filter((e: WorkEntry) => e.slug !== slug),
    }
    try {
      await putContent(updated, sha, `admin: delete ${slug}`)
      setContent(updated)
      const fresh = await getContent()
      setSha(fresh.sha)
      setPublished(true)
      setTimeout(() => setPublished(false), 5000)
    } catch (e) {
      alert('Delete failed: ' + (e as Error).message)
    }
  }

  if (loading) return <AdminLayout><p className="text-sm font-sans text-gray-500">Loading…</p></AdminLayout>
  if (error) return <AdminLayout><p className="text-sm font-sans text-red-600">{error}</p></AdminLayout>
  if (!content) return null

  return (
    <AdminLayout>
      {published && (
        <div className="mb-6 bg-green-50 border border-green-200 px-4 py-3 text-sm font-sans text-green-800">
          Published — live in ~3 minutes after Cloudflare Pages rebuilds.
        </div>
      )}

      <Section title="Site Pages">
        {[
          { label: 'Home', href: '/admin/site/home' },
          { label: 'About / Introduction', href: '/admin/site/about' },
          { label: 'Contact', href: '/admin/site/contact' },
        ].map(({ label, href }) => (
          <EntryRow key={href} title={label} editHref={href} />
        ))}
      </Section>

      <Section title="Recent Works" newHref="/admin/new?type=works">
        {content.works.map((w: WorkEntry) => (
          <EntryRow
            key={w.slug}
            title={w.title}
            editHref={`/admin/works?slug=${w.slug}`}
            onDelete={() => deletePage('works', w.slug)}
          />
        ))}
      </Section>

      <Section title="Archives" newHref="/admin/new?type=archives">
        {content.archives.map((a: WorkEntry) => (
          <EntryRow
            key={a.slug}
            title={a.title}
            editHref={`/admin/archives?slug=${a.slug}`}
            onDelete={() => deletePage('archives', a.slug)}
          />
        ))}
      </Section>
    </AdminLayout>
  )
}

function Section({ title, newHref, children }: { title: string; newHref?: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-sans uppercase tracking-[0.0625em] text-sm">{title}</h2>
        {newHref && (
          <Link href={newHref} className="text-xs font-sans border border-gray-300 px-3 py-1 hover:border-black">
            + New
          </Link>
        )}
      </div>
      <div className="divide-y divide-gray-100 border border-gray-200">{children}</div>
    </section>
  )
}

function EntryRow({ title, editHref, onDelete }: { title: string; editHref: string; onDelete?: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm font-sans">{title}</span>
      <div className="flex gap-3">
        <Link href={editHref} className="text-xs font-sans uppercase tracking-[0.0625em] hover:underline">Edit</Link>
        {onDelete && (
          <button onClick={onDelete} className="text-xs font-sans uppercase tracking-[0.0625em] text-red-600 hover:underline">
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
