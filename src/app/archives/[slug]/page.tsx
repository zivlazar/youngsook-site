import { archives } from '@/lib/data'
import { notFound } from 'next/navigation'

export function generateStaticParams() {
  return archives.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const item = archives.find((a) => a.slug === slug)
  return { title: item ? `${item.title} – Youngsook Choi` : 'Not Found' }
}

export default async function ArchiveDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const item = archives.find((a) => a.slug === slug)
  if (!item) notFound()

  return (
    <article className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-center uppercase tracking-widest text-lg font-sans mb-12">
        {item.title}
      </h1>
      <div className="space-y-6 leading-relaxed [&_img]:w-full [&_img]:h-auto [&_img]:my-4">
        {item.content.map((html, i) => (
          <div key={i} dangerouslySetInnerHTML={{ __html: html }} />
        ))}
      </div>
    </article>
  )
}
