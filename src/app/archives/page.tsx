import Link from 'next/link'
import { archives } from '@/lib/data'

export const metadata = {
  title: 'Archives – Youngsook Choi',
}

export default function Archives() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-center uppercase tracking-widest text-lg font-sans mb-12">
        Archives
      </h1>
      <ul className="space-y-8">
        {archives.map((item) => (
          <li key={item.slug}>
            <Link
              href={`/archives/${item.slug}`}
              className="font-sans uppercase tracking-wide text-sm hover:opacity-60 transition-opacity"
            >
              {item.title}
            </Link>
            <span className="block text-xs font-sans text-gray-400 mt-1">
              Continue reading →
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
