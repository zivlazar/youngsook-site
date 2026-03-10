# Design Spec: youngsook-site

**Date:** 2026-03-10
**Project:** Migration of youngsookchoi.com from IONOS WordPress to Cloudflare Pages
**Repo location:** `/Users/ziv/Documents/GitHub/youngsook-site`

---

## Goal

Recreate youngsookchoi.com as a static Next.js site, with content copied exactly from the live WordPress site (text and images, no interpretation). Deploy to Cloudflare Pages free tier, keeping the custom domain `youngsookchoi.com`.

---

## Tech Stack

Same as zivlazar-site:
- **Next.js** with `output: 'export'` (fully static)
- **Tailwind CSS v3**
- **Cloudflare Pages** (free tier, custom domain)
- No Cloudflare Worker needed (no contact form — contact is just an email address)

---

## Site Structure

### Pages

| Route | Title | Description |
|---|---|---|
| `/` | Home | Full-width hero image, no text body |
| `/about` | Introduction | Bio text only, no images |
| `/works` | Recent Works | List of 15 work titles with links |
| `/works/[slug]` | Work detail | Text + images per work |
| `/archives` | Archives | List of 16 archive titles with links |
| `/archives/[slug]` | Archive detail | Text + images per archive |
| `/contact` | Contact | Text paragraph + email + Instagram link |

### Navigation

Hamburger menu top-right opens a sidebar with links:
- Introduction → `/about`
- Recent Works → `/works`
- Archives → `/archives`
- Contact → `/contact`

---

## Content

### Works (Recent Works — 15 items)

Slugs from live site:
1. seasons-of-the-mouth
2. book-of-loss
3. in-every-bite-of-the-emperor-prologue
4. refusing-oasis
5. tayeb
6. circle-of-care
7. noguchi-encounter
8. becoming-forest
9. fermented-flower
10. yellow-furry-lullaby
11. a-mountain-a-bundle-a-spell
12. how-to-restore-a-broken-china-vase
13. not-this-future
14. green-spell
15. unapologetic-coughing
16. emperors-jade-rabbit

### Archives (16 items)

Slugs from live site:
1. childrens-peace-party
2. on-the-fringe
3. moulding-home
4. talking-knots
5. equal-ride
6. headland
7. neo-caligraphy
8. when-the-sun-came-out-so-did-submarines
9. dis-camouflage
10. 50-gold-al-balad
11. new-griffin-act-of-gold
12. land-rites
13. gate-22-returning-land
14. guro-gongdan-19662013
15. bacchus-economics
16. nameless-name

---

## Images

All images are hosted at `https://youngsookchoi.com/wp-content/uploads/`. Every image must be downloaded and stored locally in `public/images/` with the same filename. Image references in code will use local `/images/` paths.

**Known images (to be expanded during scraping):**
- Homepage hero: `IMG_7256-1-1932x1500.jpg`
- Each work/archive page has 1–7 images

---

## Layout & Visual Design

Exact copy of the original WordPress theme:

- **Header:** `YOUNGSOOK CHOI` in bold uppercase tracking + `Artist & Researcher` subtitle (smaller, italic-ish). Hamburger button top-right.
- **Sidebar nav:** slides in from right when hamburger clicked. Dark overlay. Nav items listed vertically.
- **Body typography:** serif font (Georgia or similar) for body text. Uppercase wide-tracked headings.
- **Colors:** white background, black text. Minimal.
- **Footer:** `© 2022 Youngsook Choi. All rights reserved.` centered or left-aligned.
- **Home page:** hero image fills viewport width, no text overlay.
- **Work/Archive pages:** centered text column (max ~700px), images full-width within column.

---

## Data Architecture

`src/lib/data.ts` is the single source of truth — same pattern as zivlazar-site.

```ts
export type WorkEntry = {
  slug: string
  title: string
  category: 'works' | 'archives'
  images: string[]       // filenames in public/images/
  content: ContentBlock[] // structured content blocks
}

export type ContentBlock =
  | { type: 'paragraph'; text: string; emphases?: string[] }
  | { type: 'image'; src: string; alt?: string }
```

---

## Directory Structure

```
youngsook-site/
  src/
    app/
      layout.tsx          # Root layout: Header, Footer
      page.tsx            # Home — hero image
      about/page.tsx      # Introduction bio
      works/
        page.tsx          # Works list
        [slug]/page.tsx   # Work detail
      archives/
        page.tsx          # Archives list
        [slug]/page.tsx   # Archive detail
      contact/page.tsx    # Contact
    components/
      Header.tsx          # Logo + hamburger
      NavSidebar.tsx      # Slide-in nav (client component)
      Footer.tsx
    lib/
      data.ts             # All content data
  public/
    images/               # All downloaded images
  tailwind.config.ts
  next.config.ts
  wrangler.toml           # (if needed for Pages config)
```

---

## Deployment

- Build: `npm run build` → static export to `./out/`
- Deploy: Cloudflare Pages connected to GitHub repo, auto-deploys on push to `main`
- Domain: `youngsookchoi.com` DNS pointed from IONOS to Cloudflare Pages

---

## Content Scraping Plan

During implementation, for each page on the live site:
1. Use Playwright to navigate to each URL
2. Extract all text content verbatim (no edits)
3. Extract all image URLs (`wp-content/uploads/...`)
4. Download images to `public/images/`
5. Store structured content in `src/lib/data.ts`
