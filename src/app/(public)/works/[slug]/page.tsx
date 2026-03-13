import Image from 'next/image'
import Link from 'next/link'
import { works } from '@/lib/data'
import { notFound } from 'next/navigation'

export function generateStaticParams() {
  return works.map((w) => ({ slug: w.slug }))
}

function toDescription(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160)
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const work = works.find((w) => w.slug === slug)
  if (!work) return { title: 'Not Found' }
  const description = toDescription(work.content.find(Boolean) ?? '')
  const image = work.images[0]?.src
  return {
    title: work.title,
    description,
    openGraph: {
      title: `${work.title} – Youngsook Choi`,
      description,
      url: `https://youngsookchoi.com/works/${slug}`,
      ...(image ? { images: [{ url: image, alt: work.title }] } : {}),
    },
    twitter: {
      title: `${work.title} – Youngsook Choi`,
      description,
      ...(image ? { images: [image] } : {}),
    },
  }
}

export default async function WorkDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const index = works.findIndex((w) => w.slug === slug)
  if (index === -1) notFound()
  const work = works[index]
  const prev = works[index - 1] ?? null
  const next = works[index + 1] ?? null

  return (
    <article>
      {work.images[0] && (
        <div className="relative overflow-hidden bg-black -mt-16" style={{ height: '100vh' }}>
          <Image
            src={work.images[0].src}
            alt={work.images[0].alt}
            fill
            className="object-cover"
            priority
            unoptimized
          />
        </div>
      )}
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="font-sans uppercase tracking-[0.0625em] text-[1.5em] min-[768px]:text-[2.25em] font-normal leading-tight mb-10 text-center">
          {work.title}
        </h1>
        <div className="space-y-6 leading-relaxed [&_img]:w-full [&_img]:h-auto [&_img]:my-4 [&_span.image-big]:block [&_a]:underline">
          {work.content.map((html, i) => (
            <div key={i} dangerouslySetInnerHTML={{ __html: html.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ') }} />
          ))}
        </div>
      </div>
      <nav className="flex border-t border-[#d9d9d9]" style={{ height: '73px' }}>
        {prev ? (
          <Link
            href={`/works/${prev.slug}`}
            className="flex flex-1 items-center justify-center gap-2 border-r border-[#d9d9d9] font-serif text-sm text-black hover:text-[#10b0b8] hover:bg-[#f2f2f2] transition-colors px-4 overflow-hidden"
          >
            <span className="text-xl leading-none">&#8592;</span>
            <span className="truncate uppercase tracking-[0.0625em] font-sans text-xs">{prev.title}</span>
          </Link>
        ) : (
          <div className="flex-1 border-r border-[#d9d9d9]" />
        )}
        {next ? (
          <Link
            href={`/works/${next.slug}`}
            className="flex flex-1 items-center justify-center gap-2 font-serif text-sm text-black hover:text-[#10b0b8] hover:bg-[#f2f2f2] transition-colors px-4 overflow-hidden"
          >
            <span className="truncate uppercase tracking-[0.0625em] font-sans text-xs">{next.title}</span>
            <span className="text-xl leading-none">&#8594;</span>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
      </nav>
    </article>
  )
}
