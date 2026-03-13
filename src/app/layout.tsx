import type { Metadata } from 'next'
import { Montserrat, Playfair_Display } from 'next/font/google'
import './globals.css'

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://youngsookchoi.com'),
  title: {
    default: 'Youngsook Choi – Artist & Researcher',
    template: '%s – Youngsook Choi',
  },
  description: 'Youngsook Choi is a Korean diaspora artist and researcher based in London. Her socially engaged practice explores collective grief, ecological loss, decolonisation, and solidarity.',
  keywords: [
    'Youngsook Choi',
    'Korean artist',
    'diaspora artist',
    'socially engaged art',
    'ecological grief',
    'London artist',
    'researcher',
    'Goldsmiths',
    'decolonising botany',
    'collective healing',
  ],
  authors: [{ name: 'Youngsook Choi', url: 'https://youngsookchoi.com' }],
  openGraph: {
    type: 'website',
    url: 'https://youngsookchoi.com',
    siteName: 'Youngsook Choi',
    title: 'Youngsook Choi – Artist & Researcher',
    description: 'Youngsook Choi is a Korean diaspora artist and researcher based in London. Her socially engaged practice explores collective grief, ecological loss, decolonisation, and solidarity.',
    images: [{ url: '/images/hero.jpg', width: 1200, height: 800, alt: 'Youngsook Choi' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Youngsook Choi – Artist & Researcher',
    description: 'Youngsook Choi is a Korean diaspora artist and researcher based in London. Her socially engaged practice explores collective grief, ecological loss, decolonisation, and solidarity.',
    images: ['/images/hero.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${montserrat.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  )
}
