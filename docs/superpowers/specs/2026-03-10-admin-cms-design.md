# Admin CMS Design — youngsook-site

**Goal:** Add a password-protected admin area that lets the site owner create, edit, and delete Works and Archives pages, and edit static site pages (Home, About, Contact), with changes published via GitHub commit → Cloudflare Pages rebuild (~3 min).

**Date:** 2026-03-10

---

## Architecture

The admin is a client-side section of the existing Next.js site at `/admin/*`. Since the static site cannot hold secrets, a dedicated Cloudflare Worker (`admin-worker`) acts as a secure backend — holding credentials and the GitHub token, handling authentication, and proxying all GitHub API calls.

```
Admin UI (/admin/*) → admin-worker.youngsookchoi.com → GitHub API → commit to repo
                                                                           ↓
                                                          Cloudflare Pages auto-rebuilds (~3 min)
                                                                           ↓
                                                                   Live site updated
```

**New pieces:**
1. `/admin/*` — client-side Next.js pages (login, dashboard, editor)
2. `worker/admin-worker.js` — Cloudflare Worker (auth + GitHub API proxy)
3. Worker secrets in Cloudflare dashboard: `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `GITHUB_TOKEN`, `JWT_SECRET`

---

## Authentication

- Single admin user; credentials stored as Cloudflare Worker secrets
- `ADMIN_EMAIL` — admin's email address
- `ADMIN_PASSWORD_HASH` — bcrypt hash of the admin's password
- `JWT_SECRET` — secret used to sign JWT tokens

**Login flow:**
1. Admin visits `/admin` → login form (email + password)
2. POST to `https://admin-worker.youngsookchoi.com/login`
3. Worker verifies credentials with bcrypt → returns signed JWT (24hr expiry)
4. JWT stored in `localStorage`; sent as `Authorization: Bearer <token>` on all API calls
5. Missing/expired JWT → redirect to `/admin`

**Security:** The Worker rejects all API calls without a valid JWT. The static admin pages are client-side only — no content can be read or written without a valid token. The GitHub token is never exposed to the browser.

---

## Admin UI Pages

All pages under `/admin/*` are `'use client'` components. They check for a valid JWT on mount and redirect to `/admin` if absent.

### `/admin` — Login
- Centered form: email + password fields, "Log in" button
- Minimal styling matching the site aesthetic (white background, Montserrat)
- Shows error message on failed login

### `/admin/dashboard` — Content List
Three sections:

**Site Pages** (edit only, no create/delete):
- Home — "Edit" button
- About — "Edit" button
- Contact — "Edit" button

**Recent Works:**
- List of all works with title, "Edit" and "Delete" buttons
- "+ New Work" button at the top

**Archives:**
- List of all archives with title, "Edit" and "Delete" buttons
- "+ New Archive" button at the top

Shows a "Rebuild in progress — live in ~3 min" banner after any publish action.

### `/admin/site/home` — Edit Home Page
- Hero image preview + "Replace image" file upload button
- "Save & Publish" button

### `/admin/site/about` — Edit About Page
- TipTap rich text editor pre-filled with current bio HTML
- "Save & Publish" button

### `/admin/site/contact` — Edit Contact Page
- Text fields for: email, Instagram handle
- TipTap editor for contact body text
- "Save & Publish" button

### `/admin/works/[slug]` and `/admin/archives/[slug]` — Edit Page
- Title field (text input)
- Hero image preview + "Replace image" file upload
- TipTap rich text editor with current content HTML
- "Save & Publish" button
- "Delete Page" button (confirm dialog before delete)

### `/admin/new` — New Page
- `?type=works` or `?type=archives` query param
- Title field → auto-generates slug (editable)
- Hero image upload (required)
- TipTap rich text editor (empty)
- "Save & Publish" button

---

## Rich Text Editor (TipTap)

**Package:** `@tiptap/react` + `@tiptap/starter-kit` + `@tiptap/extension-link` + `@tiptap/extension-image`

**Toolbar buttons:**
- Bold, Italic
- Heading (H2, H3)
- Paragraph
- Blockquote
- Link (insert/edit URL)
- Image (file upload → `/images/` path inserted)
- Clear formatting

**Output:** HTML string — stored directly in `data.ts` `content[]` array and rendered via `dangerouslySetInnerHTML` on public pages (no changes to public page rendering).

---

## Image Management

**Hero images:**
- One per work/archive page; also one for the Home page
- Stored as `public/images/[slug]-hero.[ext]` in the GitHub repo
- Replaces `images[0].src` in `data.ts`

**Inline content images (via TipTap toolbar):**
- Stored as `public/images/[slug]-inline-[timestamp].[ext]`
- Inserted as `<img src="/images/..." />` in content HTML

**Upload flow:**
1. Admin selects file in browser
2. Admin UI POSTs file (base64) to Worker `POST /images`
3. Worker writes file to `public/images/` in GitHub repo
4. Worker returns `/images/filename` path
5. UI inserts path into editor or hero image preview

**On page delete:**
- Worker removes entry from `data.ts`
- Worker deletes associated images from `public/images/`
- All in one GitHub commit

---

## Cloudflare Worker API (`admin-worker.js`)

**Route:** `admin-worker.youngsookchoi.com/*`

**CORS:** Allow `https://youngsookchoi.com` and `https://youngsook-site.pages.dev`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/login` | Verify credentials, return JWT |
| GET | `/content` | Read `data.ts` from GitHub |
| PUT | `/content` | Write updated `data.ts` to GitHub |
| POST | `/images` | Upload image file to `public/images/` in GitHub |
| DELETE | `/images/:filename` | Delete image file from GitHub |

All routes except `/login` require `Authorization: Bearer <jwt>`.

**GitHub API calls (from Worker):**
- Read file: `GET /repos/[owner]/youngsook-site/contents/[path]` → returns base64 content + SHA
- Write file: `PUT /repos/[owner]/youngsook-site/contents/[path]` with base64 content + SHA
- Delete file: `DELETE /repos/[owner]/youngsook-site/contents/[path]` with SHA

**Content strategy:** The Worker reads `data.ts`, parses/modifies the relevant entry, regenerates the full file as a TypeScript string, and commits it. All changes (text + images) go in a single commit with message `"admin: update [page title]"`.

---

## Worker Secrets (set via Cloudflare dashboard)

| Secret | Description |
|--------|-------------|
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of admin password |
| `GITHUB_TOKEN` | GitHub personal access token (repo scope) |
| `JWT_SECRET` | Random 32-char secret for signing JWTs |

---

## Data Flow — Editing a Work Page

1. Admin navigates to `/admin/works/seasons-of-the-mouth`
2. UI calls `GET /content` → Worker fetches `data.ts` from GitHub → returns parsed JSON
3. UI populates title field + TipTap editor with current content
4. Admin edits text, replaces hero image (file upload → `POST /images`)
5. Admin clicks "Save & Publish"
6. UI calls `PUT /content` with updated entry JSON
7. Worker reads current `data.ts` SHA from GitHub, regenerates file, commits
8. Cloudflare Pages detects commit → rebuilds → live in ~3 min
9. UI shows "Published — live in ~3 min" banner

---

## File Structure Changes

```
src/
  app/
    admin/
      page.tsx                    # Login page
      dashboard/page.tsx          # Dashboard
      site/
        home/page.tsx             # Edit home hero
        about/page.tsx            # Edit about text
        contact/page.tsx          # Edit contact info
      works/[slug]/page.tsx       # Edit work
      archives/[slug]/page.tsx    # Edit archive
      new/page.tsx                # Create new work/archive
  components/
    admin/
      AdminLayout.tsx             # Auth check wrapper + nav
      RichTextEditor.tsx          # TipTap editor component
      ImageUpload.tsx             # Hero image upload component
worker/
  admin-worker.js                 # New: admin API Worker
wrangler-admin.toml               # New: wrangler config for admin worker
```

---

## Out of Scope

- Multiple admin users
- Draft/preview before publishing
- Revision history / undo (GitHub history covers this)
- Media library browser
- Page ordering / reordering
