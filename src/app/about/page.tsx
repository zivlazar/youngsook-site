import { introduction } from '@/lib/data'

export const metadata = {
  title: 'Introduction – Youngsook Choi',
}

export default function About() {
  return (
    <article className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-center uppercase tracking-widest text-lg font-sans mb-12">
        Introduction
      </h1>
      <div className="space-y-6 leading-relaxed">
        {introduction.paragraphs.map((html, i) => (
          <p key={i} dangerouslySetInnerHTML={{ __html: html }} />
        ))}
      </div>
    </article>
  )
}
