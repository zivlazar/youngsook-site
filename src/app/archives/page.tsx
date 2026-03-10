import Link from 'next/link'
import Image from 'next/image'
import { archives } from '@/lib/data'

export const metadata = {
  title: 'Archives – Youngsook Choi',
}

export default function Archives() {
  return (
    <div>
      {archives.map((item) => (
        <Link
          key={item.slug}
          href={`/archives/${item.slug}`}
          className="group block relative overflow-hidden"
          style={{ height: '73vh' }}
        >
          {item.images[0] && (
            <Image
              src={item.images[0].src}
              alt={item.images[0].alt}
              fill
              className="object-cover transition-all duration-[125ms] ease-out group-hover:scale-[1.02] group-hover:grayscale"
              unoptimized
            />
          )}
          <div className="absolute inset-0 flex items-end">
            <div className="bg-black/25 w-full px-6 py-4">
              <h2 className="text-white font-sans uppercase tracking-[0.0625em] text-[1.375em] font-normal leading-tight">
                {item.title}
              </h2>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
