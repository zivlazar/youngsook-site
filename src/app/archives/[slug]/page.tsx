import Image from 'next/image'
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
    <article>
      {item.images[0] && (
        <div className="relative overflow-hidden bg-black -mt-16" style={{ height: '100vh' }}>
          <Image
            src={item.images[0].src}
            alt={item.images[0].alt}
            fill
            className="object-cover"
            priority
            unoptimized
          />
        </div>
      )}
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="font-sans uppercase tracking-[0.0625em] text-[1.5em] min-[768px]:text-[2.25em] font-normal leading-tight mb-10">
          {item.title}
        </h1>
        <div className="space-y-6 leading-relaxed [&_img]:w-full [&_img]:h-auto [&_img]:my-4 [&_span.image-big]:block">
          {item.content.map((html, i) => (
            <div key={i} dangerouslySetInnerHTML={{ __html: html }} />
          ))}
        </div>
      </div>
    </article>
  )
}
