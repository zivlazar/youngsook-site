import { contact } from '@/lib/data'

export const metadata = {
  title: 'Contact – Youngsook Choi',
}

export default function Contact() {
  return (
    <article className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-center uppercase tracking-widest text-lg font-sans mb-12">
        Contact
      </h1>
      <div className="space-y-6 leading-relaxed">
        {contact.paragraphs.map((text, i) => (
          <p key={i}>{text}</p>
        ))}
        <p>
          {contact.email} or IG{' '}
          <a
            href={contact.instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {contact.instagram.handle}
          </a>
        </p>
      </div>
    </article>
  )
}
