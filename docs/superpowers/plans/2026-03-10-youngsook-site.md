# youngsook-site Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate youngsookchoi.com from WordPress/IONOS to a static Next.js site deployed on Cloudflare Pages free tier, with content copied exactly from the live site.

**Architecture:** Scaffold a Next.js static export project mirroring zivlazar-site's structure. Use Playwright to scrape all text and images from the live WordPress site verbatim, store structured content in `src/lib/data.ts`, then build pages and components that replicate the original layout exactly.

**Tech Stack:** Next.js (output: export), Tailwind CSS v3, Cloudflare Pages, Playwright (scraping only — dev dependency)

**Spec:** `docs/superpowers/specs/2026-03-10-youngsook-site-design.md`

---

## File Map

Files to create:

| File | Responsibility |
|---|---|
| `package.json` | Dependencies, scripts |
| `next.config.ts` | Static export config |
| `tailwind.config.ts` | Design tokens, font stack |
| `tsconfig.json` | TypeScript config |
| `src/app/layout.tsx` | Root layout: Header, Footer |
| `src/app/globals.css` | Tailwind directives, base styles |
| `src/app/page.tsx` | Home — hero image |
| `src/app/about/page.tsx` | Introduction bio |
| `src/app/works/page.tsx` | Recent Works list |
| `src/app/works/[slug]/page.tsx` | Work detail with images |
| `src/app/archives/page.tsx` | Archives list |
| `src/app/archives/[slug]/page.tsx` | Archive detail with images |
| `src/app/contact/page.tsx` | Contact text + links |
| `src/components/Header.tsx` | Logo + hamburger (client) |
| `src/components/NavSidebar.tsx` | Slide-in nav (client) |
| `src/components/Footer.tsx` | Copyright footer |
| `src/lib/data.ts` | All scraped content — single source of truth |
| `public/images/` | All downloaded images |
| `public/_headers` | Cloudflare security headers |

---

## Chunk 1: Project Scaffold

### Task 1: Initialise the Next.js project

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `src/app/globals.css`

- [ ] **Step 1: Scaffold the project**

Run from `/Users/ziv/Documents/GitHub/`:
```bash
cd youngsook-site
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
```
When prompted, accept all defaults.

- [ ] **Step 2: Move src into place**

`create-next-app` puts files in the root. Verify the directory structure matches:
```
youngsook-site/
  src/app/
  src/components/   ← create this
  src/lib/          ← create this
  public/
  package.json
  next.config.ts
  tailwind.config.ts
```

Create missing dirs:
```bash
mkdir -p src/components src/lib public/images
```

- [ ] **Step 3: Configure static export in `next.config.ts`**

Replace content of `next.config.ts` with:
```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
}

export default nextConfig
```

- [ ] **Step 4: Configure Tailwind in `tailwind.config.ts`**

Replace content with:
```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Georgia', 'Times New Roman', 'serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 5: Set up globals.css**

Replace `src/app/globals.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply font-serif bg-white text-black;
  }
}
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```
Expected: Server running at http://localhost:3000 with no errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js static export project"
```

---

## Chunk 2: Content Scraping

### Task 2: Scrape homepage hero image

**Files:**
- Create: `public/images/hero.jpg`

- [ ] **Step 1: Download the hero image**

```bash
curl -o public/images/hero.jpg "https://youngsookchoi.com/wp-content/uploads/2022/06/IMG_7256-1-1932x1500.jpg"
```

Expected: `public/images/hero.jpg` exists, ~500KB–2MB.

- [ ] **Step 2: Commit**

```bash
git add public/images/hero.jpg
git commit -m "feat: add homepage hero image"
```

---

### Task 3: Scrape Introduction page (about)

**Files:**
- Modify: `src/lib/data.ts` (add `introduction` export)

- [ ] **Step 1: Visit the page in browser and verify content**

Navigate to https://youngsookchoi.com/about-youngsook and confirm text matches what was captured in the design spec.

- [ ] **Step 2: Create `src/lib/data.ts` with introduction content**

Create `src/lib/data.ts`:
```ts
export const introduction = {
  paragraphs: [
    `Hello! Thanks for coming by!`,
    `Youngsook is a Korean diaspora artist/researcher based in London. Holding a PhD in human geography that intersects feminist geography with queer theories, Youngsook's practice expands on our relationships with places, ecosystems and interspecies communities affected by the systematic exploitation of neo-colonial operations. Under the umbrella theme of political spirituality, her socially engaged practice explores intimate aesthetics of solidarity and collective healing.`,
    // paragraph 3 has inline emphasis — stored as HTML string
    `Grief has been the focus of Youngsook's recent works, posing collective grief as the process of socio-political autopsy upon structural conditions intersecting human loss with environmental destruction. <em>Not This Future</em> (2020), commemorating the Essex 39 incident rooted in the Formosa Marine Disaster; <em>In Every Bite of the Emperor</em> (2021-ongoing), the transnational weaving of neo-colonial narratives around damaged ecosystems and struggling communities; <em>The Book of Loss (2022)</em>, performative intervention for remembrance of seven lost glaciers; <em>Slow Sips with Earth</em> (2023-ongoing), engaging communities in tea mixing as a creative method of writing a prayer for broken Earth; <em>Cockles of My Heart</em> (2024), commemorating deep sea trauma and 20 years' remembrance of Morecambe Bay cockle pickers tragedy; <em>Bahami – Stories on the Plate</em> (2024), exploring the ecological impact of conflicts with Afghan refugee women, are in tandem with this enquiry.`,
    `Youngsook's works have been presented internationally. Amongst them are Arts Catalyst, Asia-Art-Activism, Barbican Centre, Bow Arts, Camden Arts Centre, Coventry Biennial 2021, Estuary Festival, FACT Liverpool, Flat Time House, GOSH Arts, Heart of Glass, Liverpool Biennial 2021, Milton Keynes Arts Centre, Milton Keynes Islamic Arts and Culture, Nottingham Contemporary, Rich Mix, S1 Artspace, Up Projects in the UK; ARKO Art Center, Seoul Mediacity Biennale 2023, Seoul Museum of Art, The Book Society in Korea; Documenta 15, Kunsthalle am Hamburger Platz in Germany; British Council, Gerimis in Malaysia; and Nextdoor ARI in Australia.`,
    `With an emphasis on collective learning and imagination, Youngsook founded the transnational eco-grief council <em>Foreshadowing</em> and co-founded the research-practice working group <em>Decolonising Botany</em>. Youngsook teaches Critical Studies at the Fine Arts Department, Goldsmiths University of London, exploring transformative pedagogy (bell hooks).`,
  ],
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/data.ts
git commit -m "feat: add introduction content to data.ts"
```

---

### Task 4: Scrape Contact page

**Files:**
- Modify: `src/lib/data.ts` (add `contact` export)

- [ ] **Step 1: Add contact data to `src/lib/data.ts`**

Append to `src/lib/data.ts`:
```ts
export const contact = {
  paragraphs: [
    `I am a keen collaborator for inter-disciplinary practice or research/development companionship. My current subjects of interest are 1. ecological grief as a site of inter-species witnessing, healing and solidarity, 2. decolonising epistemologies within nature science and geography, and 3. new technological methods as gateways to unlock and discover the languages of other-than-humans.`,
    `As for commissions, I mainly work with/for/about sociocultural margins and children & young people, ideally in a long-term engagement. I am interested in how socially charged art practices can help imagine and build soft infrastructure for care, collective healing and alternative pedagogy. Previous commissions supported by Arts Catalyst, Barbican Centre, Camden Arts Centre, Coventry Biennial, Liverpool Biennial, FACT Liverpool, Heart of Glass, Milton Keynes Art Centre, MK Islamic Arts and Culture, Rich Mix and Arts Council of Korea.`,
    `Potential co-conspirers, please contact me via:`,
  ],
  email: 'selfmadecities@gmail.com',
  instagram: {
    handle: '@young.sook.choi',
    url: 'https://www.instagram.com/young.sook.choi/',
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/data.ts
git commit -m "feat: add contact content to data.ts"
```

---

### Task 5: Scrape all Work pages (15 items)

For each work page, use Playwright (or browser) to:
1. Visit the URL
2. Copy all text verbatim
3. Note all image URLs (`wp-content/uploads/...`)
4. Download images to `public/images/`

**Pages to scrape** (visit each URL on live site):

| Title | URL |
|---|---|
| Seasons of the Mouth | /seasons-of-the-mouth |
| Book of Loss | /book-of-loss |
| In Every Bite of the Emperor – Prologue | /in-every-bite-of-the-emperor-prologue |
| Refusing Oasis | /refusing-oasis |
| Tayeb طيب | /tayeb-طيب |
| Circle of Care | /circle-of-care |
| Noguchi Encounter | /noguchi-encounter |
| Becoming Forest | /becoming-forest |
| Fermented Flower | /fermented-flower |
| Yellow Furry Lullaby | /yellow-furry-lullaby |
| A mountain A bundle A spell | /a-mountain-a-bundle-a-spell |
| How to Restore a Broken China Vase | /how-to-restore-a-broken-china-vase |
| Not This Future | /not-this-futre |
| Green Spell | /green-spell |
| Unapologetic Coughing | /unapologetic-coughing |
| Emperor's Jade Rabbit | /emperors-jade-rabbit |

- [ ] **Step 1: Visit each work URL and extract content**

For each URL above, navigate to the page and:
- Copy full text content verbatim (including line breaks between paragraphs)
- Record every image `src` attribute found in the article

Use this Playwright evaluation to get images from any page:
```js
() => Array.from(document.querySelectorAll('article img')).map(i => ({ src: i.src, alt: i.alt }))
```

Use this to get text content blocks:
```js
() => Array.from(document.querySelectorAll('article .entry-content p')).map(p => p.innerHTML)
```

- [ ] **Step 2: Download all images for works**

For each image URL found, download to `public/images/` preserving the filename:
```bash
# Example pattern — repeat for each image URL found
curl -o "public/images/FILENAME.jpg" "https://youngsookchoi.com/wp-content/uploads/YYYY/MM/FILENAME.jpg"
```

- [ ] **Step 3: Add works array to `src/lib/data.ts`**

Add type definitions and works array. Each entry follows this shape:
```ts
export type WorkEntry = {
  slug: string
  title: string
  category: 'works' | 'archives'
  content: string[]  // array of paragraph HTML strings (verbatim from site)
  images: { src: string; alt: string }[]  // local /images/ paths
}

export const works: WorkEntry[] = [
  {
    slug: 'seasons-of-the-mouth',
    title: 'Seasons of the Mouth',
    category: 'works',
    content: [
      // paste scraped paragraphs here as innerHTML strings
    ],
    images: [
      { src: '/images/02-2000x1435.png', alt: '' },
      { src: '/images/01-1024x577.png', alt: '' },
      // etc
    ],
  },
  // ... repeat for all 16 works
]
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/data.ts public/images/
git commit -m "feat: add works content and images to data.ts"
```

---

### Task 6: Scrape all Archive pages (16 items)

Same process as Task 5 but for archives.

**Pages to scrape:**

| Title | URL |
|---|---|
| Children's Peace Party | /childrens-peace-party |
| On the Fringe | /on-the-fringe |
| Moulding Home | /moulding-home |
| Talking Knots | /talking-knots |
| Equal Ride | /equal-ride |
| Headland | /headland |
| Neo Calligraphy | /neo-caligraphy |
| When the sun sets | /when-the-sun-came-out-so-did-submarines |
| Un-Camouflage | /dis-camouflage |
| 50 Gold Al Balad | /50-gold-al-balad |
| New Griffin | /new-griffin-act-of-gold |
| Land Rites | /land-rites |
| GATE 22 | /gate-22-returning-land |
| Guro Gongdan 19662013 | /guro-gongdan-19662013 |
| Bacchus Economics | /bacchus-economics |
| Nameless Name | /nameless-name |

- [ ] **Step 1: Visit each archive URL and extract content** (same method as Task 5)

- [ ] **Step 2: Download all images for archives** (same method as Task 5)

- [ ] **Step 3: Add archives array to `src/lib/data.ts`**

```ts
export const archives: WorkEntry[] = [
  {
    slug: 'childrens-peace-party',
    title: "Children's Peace Party",
    category: 'archives',
    content: [ /* scraped paragraphs */ ],
    images: [ /* local image paths */ ],
  },
  // ... repeat for all 16 archives
]
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/data.ts public/images/
git commit -m "feat: add archives content and images to data.ts"
```

---

## Chunk 3: Shared Components

### Task 7: Build Header + NavSidebar

**Files:**
- Create: `src/components/Header.tsx`
- Create: `src/components/NavSidebar.tsx`

- [ ] **Step 1: Create `src/components/NavSidebar.tsx`**

```tsx
'use client'

import Link from 'next/link'

interface NavSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function NavSidebar({ isOpen, onClose }: NavSidebarProps) {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white z-50 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col pt-16 px-8`}
      >
        <nav>
          <h2 className="sr-only">Menu</h2>
          <ul className="space-y-6">
            {[
              { label: 'Introduction', href: '/about' },
              { label: 'Recent Works', href: '/works' },
              { label: 'Archives', href: '/archives' },
              { label: 'Contact', href: '/contact' },
            ].map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onClose}
                  className="text-sm font-sans uppercase tracking-widest hover:opacity-60 transition-opacity"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Create `src/components/Header.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import NavSidebar from './NavSidebar'

export default function Header() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-30 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-baseline gap-3">
          <Link href="/" className="text-sm font-sans font-bold uppercase tracking-widest">
            Youngsook Choi
          </Link>
          <span className="text-sm font-sans italic text-gray-600">Artist &amp; Researcher</span>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Toggle navigation"
          className="text-xl font-sans"
        >
          ☰
        </button>
      </header>

      <NavSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  )
}
```

- [ ] **Step 3: Compare against original**

Take a screenshot of https://youngsookchoi.com and compare with `npm run dev` output at http://localhost:3000. Header should match: bold uppercase name, italic subtitle, hamburger right.

- [ ] **Step 4: Commit**

```bash
git add src/components/
git commit -m "feat: add Header and NavSidebar components"
```

---

### Task 8: Build Footer

**Files:**
- Create: `src/components/Footer.tsx`

- [ ] **Step 1: Create `src/components/Footer.tsx`**

```tsx
export default function Footer() {
  return (
    <footer className="mt-24 py-8 border-t border-gray-100">
      <p className="text-xs font-sans text-gray-500 px-6">
        © 2022 Youngsook Choi. All rights reserved.
      </p>
    </footer>
  )
}
```

- [ ] **Step 2: Wire up root layout `src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Youngsook Choi – Artist & Researcher',
  description: 'Youngsook Choi is a Korean diaspora artist/researcher based in London.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main className="pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Footer.tsx src/app/layout.tsx
git commit -m "feat: add Footer and root layout"
```

---

## Chunk 4: Pages

### Task 9: Build Home page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace `src/app/page.tsx`**

```tsx
import Image from 'next/image'

export default function Home() {
  return (
    <div className="w-full">
      <Image
        src="/images/hero.jpg"
        alt=""
        width={1932}
        height={1500}
        className="w-full h-auto"
        priority
        unoptimized
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify visually**

Run `npm run dev`, open http://localhost:3000. Should show the full-width hero image (hair in grass), white header above.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add home page with hero image"
```

---

### Task 10: Build Introduction (About) page

**Files:**
- Create: `src/app/about/page.tsx`

- [ ] **Step 1: Create `src/app/about/page.tsx`**

```tsx
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
```

- [ ] **Step 2: Verify against original**

Compare http://localhost:3000/about with https://youngsookchoi.com/about-youngsook. Text should be identical, italicised work titles should render correctly.

- [ ] **Step 3: Commit**

```bash
git add src/app/about/
git commit -m "feat: add Introduction page"
```

---

### Task 11: Build Contact page

**Files:**
- Create: `src/app/contact/page.tsx`

- [ ] **Step 1: Create `src/app/contact/page.tsx`**

```tsx
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
```

- [ ] **Step 2: Verify against original**

Compare http://localhost:3000/contact with https://youngsookchoi.com/contact.

- [ ] **Step 3: Commit**

```bash
git add src/app/contact/
git commit -m "feat: add Contact page"
```

---

### Task 12: Build Works list page

**Files:**
- Create: `src/app/works/page.tsx`

- [ ] **Step 1: Create `src/app/works/page.tsx`**

```tsx
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
```

- [ ] **Step 2: Verify against original**

Compare http://localhost:3000/works with https://youngsookchoi.com/category/works. All 16 titles should appear.

- [ ] **Step 3: Commit**

```bash
git add src/app/works/
git commit -m "feat: add Recent Works list page"
```

---

### Task 13: Build Works detail page

**Files:**
- Create: `src/app/works/[slug]/page.tsx`

- [ ] **Step 1: Create `src/app/works/[slug]/page.tsx`**

```tsx
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
    <article className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-center uppercase tracking-widest text-lg font-sans mb-12">
        {work.title}
      </h1>

      {/* First image before text if present */}
      {work.images[0] && (
        <div className="mb-8">
          <Image
            src={work.images[0].src}
            alt={work.images[0].alt}
            width={2000}
            height={1400}
            className="w-full h-auto"
            unoptimized
          />
        </div>
      )}

      <div className="space-y-6 leading-relaxed">
        {work.content.map((html, i) => (
          <p key={i} dangerouslySetInnerHTML={{ __html: html }} />
        ))}
      </div>

      {/* Remaining images after text */}
      {work.images.slice(1).map((img, i) => (
        <div key={i} className="mt-8">
          <Image
            src={img.src}
            alt={img.alt}
            width={2000}
            height={1400}
            className="w-full h-auto"
            unoptimized
          />
        </div>
      ))}
    </article>
  )
}
```

**Note:** The exact image placement (before/after text, or interspersed) must match the original page layout. During content scraping (Task 5), note where images appear relative to text paragraphs and adjust the content array to include `{ type: 'image', src: '...' }` blocks at the correct positions if needed. If images are always grouped at the bottom, the template above is correct.

- [ ] **Step 2: Verify one work page**

Compare http://localhost:3000/works/seasons-of-the-mouth with https://youngsookchoi.com/seasons-of-the-mouth.

- [ ] **Step 3: Commit**

```bash
git add src/app/works/[slug]/
git commit -m "feat: add Work detail page"
```

---

### Task 14: Build Archives list + detail pages

Same pattern as Tasks 12–13 but for archives.

**Files:**
- Create: `src/app/archives/page.tsx`
- Create: `src/app/archives/[slug]/page.tsx`

- [ ] **Step 1: Create `src/app/archives/page.tsx`**

Copy `src/app/works/page.tsx`, replace `works` import with `archives`, update title to `Archives` and update links to `/archives/${archive.slug}`.

- [ ] **Step 2: Create `src/app/archives/[slug]/page.tsx`**

Copy `src/app/works/[slug]/page.tsx`, replace `works` import with `archives`.

- [ ] **Step 3: Verify one archive page**

Compare http://localhost:3000/archives with https://youngsookchoi.com/category/archives.

- [ ] **Step 4: Commit**

```bash
git add src/app/archives/
git commit -m "feat: add Archives list and detail pages"
```

---

## Chunk 5: Build Verification + Deployment

### Task 15: Full build check

- [ ] **Step 1: Run the build**

```bash
npm run build
```
Expected: No errors. `out/` directory created with all static pages.

- [ ] **Step 2: Check all routes are generated**

```bash
ls out/
ls out/works/
ls out/archives/
```
Expected: all slugs present as directories.

- [ ] **Step 3: Fix any build errors**

Common issues:
- `params` must be awaited in Next.js 15+ (already handled in template above)
- Image width/height mismatches — use `fill` prop if dimensions unknown
- Missing slugs in `generateStaticParams` — verify all entries in data.ts have unique slugs

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix: resolve any build issues"
```

---

### Task 16: Cloudflare Pages deployment config

**Files:**
- Create: `public/_headers`
- Verify: `wrangler.toml` not needed (Pages auto-detects Next.js static export)

- [ ] **Step 1: Create `public/_headers`**

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

- [ ] **Step 2: Create GitHub repository**

```bash
gh repo create youngsook-site --public --source=. --remote=origin --push
```

- [ ] **Step 3: Connect to Cloudflare Pages**

In Cloudflare dashboard:
1. Pages → Create a project → Connect to Git → select `youngsook-site`
2. Build settings:
   - Framework preset: Next.js (Static HTML Export)
   - Build command: `npm run build`
   - Build output directory: `out`
3. Save and deploy

- [ ] **Step 4: Add custom domain**

In Cloudflare Pages project → Custom domains → Add `youngsookchoi.com`.
Update DNS at IONOS: point `youngsookchoi.com` A record (or CNAME) to the Cloudflare Pages URL shown.

- [ ] **Step 5: Verify live site**

Visit https://youngsookchoi.com — all pages should load, images should display, navigation should work.

- [ ] **Step 6: Final commit**

```bash
git add public/_headers
git commit -m "feat: add Cloudflare Pages headers and deployment config"
git push
```

---

## Summary of Commits

1. `feat: scaffold Next.js static export project`
2. `feat: add homepage hero image`
3. `feat: add introduction content to data.ts`
4. `feat: add contact content to data.ts`
5. `feat: add works content and images to data.ts`
6. `feat: add archives content and images to data.ts`
7. `feat: add Header and NavSidebar components`
8. `feat: add Footer and root layout`
9. `feat: add home page with hero image`
10. `feat: add Introduction page`
11. `feat: add Contact page`
12. `feat: add Recent Works list page`
13. `feat: add Work detail page`
14. `feat: add Archives list and detail pages`
15. `fix: resolve any build issues`
16. `feat: add Cloudflare Pages headers and deployment config`
