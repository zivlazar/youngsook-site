import Image from 'next/image'
import { works } from '@/lib/data'
import { notFound } from 'next/navigation'

export function generateStaticParams() {
  return works.map((w) => ({ slug: w.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const work = works.find((w) => w.slug === slug)
  return { title: work ? `${work.title} – Youngsook Choi` : 'Not Found' }
}

export default async function WorkDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const work = works.find((w) => w.slug === slug)
  if (!work) notFound()

  return (
    <article className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-center uppercase tracking-widest text-lg font-sans mb-12">
        {work.title}
      </h1>
      <div className="space-y-6 leading-relaxed [&_img]:w-full [&_img]:h-auto [&_img]:my-4">
        {work.content.map((html, i) => (
          <div key={i} dangerouslySetInnerHTML={{ __html: html }} />
        ))}
      </div>
    </article>
  )
}
