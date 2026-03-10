import Link from 'next/link'
import { works } from '@/lib/data'

export const metadata = {
  title: 'Recent Works – Youngsook Choi',
}

export default function Works() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-center uppercase tracking-widest text-lg font-sans mb-12">
        Recent Works
      </h1>
      <ul className="space-y-8">
        {works.map((work) => (
          <li key={work.slug}>
            <Link
              href={`/works/${work.slug}`}
              className="font-sans uppercase tracking-wide text-sm hover:opacity-60 transition-opacity"
            >
              {work.title}
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
