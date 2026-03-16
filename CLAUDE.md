# CLAUDE.md — youngsook-site

Portfolio site for Youngsook Choi (Artist & Researcher). Migrated from WordPress/IONOS to static Next.js. Deployed to Cloudflare Pages at [youngsookchoi.com](https://youngsookchoi.com).

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Static export → ./out/
npm run lint     # ESLint
```

## Architecture

- **Next.js** with `output: 'export'` — fully static site, no SSR
- **Tailwind CSS v3** for styling
- **Cloudflare Pages** hosts the static build (`./out/`)
- No Cloudflare Worker needed — contact is email-only

## Directory Structure

```
src/
  app/                  # Next.js App Router pages
    layout.tsx          # Root layout: Header, Footer
    page.tsx            # Home — full-width hero image
    about/page.tsx      # Introduction bio
    works/
      page.tsx          # Recent Works list (16 items)
      [slug]/page.tsx   # Work detail — text + images
    archives/
      page.tsx          # Archives list (16 items)
      [slug]/page.tsx   # Archive detail — text + images
    contact/page.tsx    # Contact — text, email, Instagram
  components/
    Header.tsx          # Logo + hamburger (client component)
    NavSidebar.tsx      # Slide-in nav (client component)
    Footer.tsx
  lib/
    data.ts             # All site content — single source of truth
worker/
  admin-worker.js       # Cloudflare Worker: OTP login + content/image API
  wrangler-admin.toml   # Worker config (deploy with: npx wrangler deploy --config wrangler-admin.toml)
  .dev.vars             # Local dev secrets (gitignored)
public/
  images/               # All downloaded images (slug-prefixed filenames)
  _headers              # Cloudflare Pages security headers
```

## Key Patterns

- `src/lib/data.ts` is the single source of truth for all content: `introduction`, `contact`, `works[]`, `archives[]`
- Works and archives use the `WorkEntry` type: `{ slug, title, category, content: string[], images: { src, alt }[] }`
- Content strings in `data.ts` are raw HTML (verbatim from original WordPress site) — rendered with `dangerouslySetInnerHTML`
- Image filenames are prefixed with their work/archive slug to avoid collisions (e.g. `seasons-of-the-mouth-02-2000x1435.png`)
- Images use `unoptimized` prop — required because of static export mode
- `'use client'` only on interactive components (Header, NavSidebar)
- Layout uses a centered `max-w-2xl mx-auto px-6` column for content pages

## Design

- White background, black serif text (Georgia)
- Uppercase wide-tracked headings (font-sans)
- Fixed header: `YOUNGSOOK CHOI` bold caps + `Artist & Researcher` italic subtitle + hamburger right
- Slide-in sidebar navigation from the right
- Footer: `© 2022 Youngsook Choi. All rights reserved.`
- Home page: full-viewport hero image, no text

## Admin Panel

- URL: `youngsookchoi.com/admin`
- Login: passwordless OTP — enter `selfmadecities@gmail.com`, receive 6-digit code via email, enter it to log in
- Backed by Cloudflare Worker at `youngsook-admin-worker.zivlazar.workers.dev`
- Worker handles: OTP request/verify, content read/write (via GitHub API), image upload/delete
- JWT issued on successful verify, stored in `localStorage`, expires after 24h
- OTP delivered via [Resend](https://resend.com) from `onboarding@resend.dev`
- Worker secrets (set via `npx wrangler secret put <NAME> --config wrangler-admin.toml`):
  - `ADMIN_EMAIL` — `selfmadecities@gmail.com`
  - `RESEND_API_KEY` — from resend.com/api-keys
  - `JWT_SECRET`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`
- KV namespace `OTP_KV` bound in `wrangler-admin.toml` — stores OTP codes with TTL + rate limits
- Content stored in `src/lib/content.json` (written to GitHub via worker, triggers Cloudflare Pages rebuild)

## Gotchas

- Static export means no API routes
- `trailingSlash: true` in next.config.ts
- All images are stored locally in `public/images/` — never reference the original `wp-content/uploads` URLs
- Content text is copied verbatim from the original site — do not edit or paraphrase
- `archives` slug for "Neo Calligraphy" is `neo-caligraphy` (typo from original WordPress URL — keep it)
- `archives` slug for "When the sun sets" is `when-the-sun-came-out-so-did-submarines` (from original URL — keep it)
- `works` slug for "Not This Future" is `not-this-future` (original WordPress URL was `not-this-futre` — typo corrected in our slugs)
