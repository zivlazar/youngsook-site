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
  const [reordering, setReordering] = useState(false)

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

  async function movePage(type: 'works' | 'archives', slug: string, dir: -1 | 1) {
    if (!content || reordering) return
    const list = [...content[type]]
    const idx = list.findIndex((e: WorkEntry) => e.slug === slug)
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= list.length) return
    ;[list[idx], list[newIdx]] = [list[newIdx], list[idx]]
    const updated = { ...content, [type]: list }
    setReordering(true)
    try {
      await putContent(updated, sha, `admin: reorder ${type}`)
      setContent(updated)
      const fresh = await getContent()
      setSha(fresh.sha)
      setPublished(true)
      setTimeout(() => setPublished(false), 5000)
    } catch (e) {
      alert('Reorder failed: ' + (e as Error).message)
    } finally {
      setReordering(false)
    }
  }

  if (loading) return <AdminLayout><p className="text-sm font-sans text-gray-500">Loading…</p></AdminLayout>
  if (error) return <AdminLayout><p className="text-sm font-sans text-red-600">{error}</p></AdminLayout>
  if (!content) return null

  return (
    <AdminLayout>
      {published && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-black text-white text-xs font-sans px-5 py-3 shadow-lg">
          Saved & published. It may take ~1 minute to update on the live site.
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
        {content.works.map((w: WorkEntry, i: number) => (
          <EntryRow
            key={w.slug}
            title={w.title}
            editHref={`/admin/works?slug=${w.slug}`}
            onDelete={() => deletePage('works', w.slug)}
            onMoveUp={i > 0 ? () => movePage('works', w.slug, -1) : undefined}
            onMoveDown={i < content.works.length - 1 ? () => movePage('works', w.slug, 1) : undefined}
            reordering={reordering}
          />
        ))}
      </Section>

      <Section title="Archives" newHref="/admin/new?type=archives">
        {content.archives.map((a: WorkEntry, i: number) => (
          <EntryRow
            key={a.slug}
            title={a.title}
            editHref={`/admin/archives?slug=${a.slug}`}
            onDelete={() => deletePage('archives', a.slug)}
            onMoveUp={i > 0 ? () => movePage('archives', a.slug, -1) : undefined}
            onMoveDown={i < content.archives.length - 1 ? () => movePage('archives', a.slug, 1) : undefined}
            reordering={reordering}
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

function EntryRow({ title, editHref, onDelete, onMoveUp, onMoveDown, reordering }: {
  title: string
  editHref: string
  onDelete?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  reordering?: boolean
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm font-sans">{title}</span>
      <div className="flex gap-3 items-center">
        <Link href={editHref} className="text-xs font-sans uppercase tracking-[0.0625em] hover:underline">Edit</Link>
        {onDelete && (
          <button onClick={onDelete} className="text-xs font-sans uppercase tracking-[0.0625em] text-red-600 hover:underline">
            Delete
          </button>
        )}
        {(onMoveUp || onMoveDown) && (
          <div className="flex gap-1">
            <button onClick={onMoveUp} disabled={!onMoveUp || reordering} className="text-xs font-sans px-1 border border-gray-300 hover:border-black disabled:opacity-30 disabled:cursor-default">↑</button>
            <button onClick={onMoveDown} disabled={!onMoveDown || reordering} className="text-xs font-sans px-1 border border-gray-300 hover:border-black disabled:opacity-30 disabled:cursor-default">↓</button>
          </div>
        )}
      </div>
    </div>
  )
}
