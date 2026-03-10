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
        <h1 className="font-sans uppercase tracking-[0.0625em] text-[1.5em] min-[768px]:text-[2.25em] font-normal leading-tight mb-10">
          {work.title}
        </h1>
        <div className="space-y-6 leading-relaxed [&_img]:w-full [&_img]:h-auto [&_img]:my-4 [&_span.image-big]:block">
          {work.content.map((html, i) => (
            <div key={i} dangerouslySetInnerHTML={{ __html: html }} />
          ))}
        </div>
      </div>
    </article>
  )
}
