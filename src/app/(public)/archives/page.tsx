import Link from 'next/link'
import Image from 'next/image'
import { archives } from '@/lib/data'

export const metadata = {
  title: 'Archives',
  description: 'Archived works by Youngsook Choi — a body of socially engaged practice spanning ecological grief, decolonisation, queer geography, and collective healing.',
  openGraph: {
    title: 'Archives – Youngsook Choi',
    description: 'Archived works by Youngsook Choi — a body of socially engaged practice spanning ecological grief, decolonisation, queer geography, and collective healing.',
    url: 'https://youngsookchoi.com/archives',
  },
  twitter: {
    title: 'Archives – Youngsook Choi',
    description: 'Archived works by Youngsook Choi — a body of socially engaged practice spanning ecological grief, decolonisation, queer geography, and collective healing.',
  },
}

export default function Archives() {
  return (
    <div className="grid grid-cols-1 min-[568px]:grid-cols-2 min-[1024px]:grid-cols-3">
      {archives.map((item) => (
        <Link
          key={item.slug}
          href={`/archives/${item.slug}`}
          className="group relative overflow-hidden aspect-square bg-black"
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
            <div className="bg-black/25 w-full px-4 py-3">
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
