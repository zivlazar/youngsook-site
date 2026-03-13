import { contact } from '@/lib/data'

export const metadata = {
  title: 'Contact',
  description: 'Collaborate with Youngsook Choi — open to interdisciplinary commissions, research partnerships, and long-term socially engaged art projects. Interested in ecological grief, decolonising epistemologies, and new technological methods.',
  openGraph: {
    title: 'Contact – Youngsook Choi',
    description: 'Collaborate with Youngsook Choi — open to interdisciplinary commissions, research partnerships, and long-term socially engaged art projects.',
    url: 'https://youngsookchoi.com/contact',
  },
  twitter: {
    title: 'Contact – Youngsook Choi',
    description: 'Collaborate with Youngsook Choi — open to interdisciplinary commissions, research partnerships, and long-term socially engaged art projects.',
  },
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
