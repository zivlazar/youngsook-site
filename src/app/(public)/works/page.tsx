import Link from 'next/link'
import Image from 'next/image'
import { works } from '@/lib/data'

export const metadata = {
  title: 'Recent Works – Youngsook Choi',
}

export default function Works() {
  return (
    <div className="grid grid-cols-1 min-[568px]:grid-cols-2 min-[1024px]:grid-cols-3">
      {works.map((work) => (
        <Link
          key={work.slug}
          href={`/works/${work.slug}`}
          className="group relative overflow-hidden aspect-square bg-black"
        >
          {work.images[0] && (
            <Image
              src={work.images[0].src}
              alt={work.images[0].alt}
              fill
              className="object-cover transition-all duration-[125ms] ease-out group-hover:scale-[1.02] group-hover:grayscale"
              unoptimized
            />
          )}
          <div className="absolute inset-0 flex items-end">
            <div className="bg-black/25 w-full px-4 py-3">
              <h2 className="text-white font-sans uppercase tracking-[0.0625em] text-[1.375em] font-normal leading-tight">
                {work.title}
              </h2>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
