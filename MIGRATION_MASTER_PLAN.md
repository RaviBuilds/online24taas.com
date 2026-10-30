# Online24Taas — migration master plan (current, replaces earlier assumptions)

Last updated 2026-10-30. Source of truth: `../online24taas/APP-DATA.SQL` (sha256 `41939810…2741`, read-only).

## 1. Verified facts that changed earlier assumptions
| Earlier assumption | Verified reality |
|---|---|
| Sanity project `mkiaioc7` is reachable from the CLI | The CLI login is **not a member** of `mkiaioc7`; it administers only `qvtcbb1j`. `mkiaioc7/production` is publicly *readable* (118 docs: 1 author, 14 categories, 89 tags, 14 assets), but not writable from here |
| Sanity write token is "blank, auth unavailable" | CLI auth exists and works for `qvtcbb1j` |
| Elementor builds the content | Elementor is **not active**. Content = Gutenberg blocks (223 posts, 5 pages) or empty (437 posts) |
| Slugs are usable | All 665 slugs were percent-encoded; 216 were cut mid-word at WordPress' 200-char limit; 1 page/post pair collided; 77 of 103 seeded taxonomy slugs in `mkiaioc7` are still percent-encoded |
| Titles are plain text | 13 titles contain `<br>`, `<strong>`, `&nbsp;` |
| 19 recoverable drafts | 20 rows: 19 drafts + 1 auto-draft (consistent). 10 drafts have body text, 8 title only, 1 empty |
| Empty-body = 437 | Confirmed 437 literal-empty; 4 more (245, 269, 854, 1119) hold only empty-paragraph/placeholder-image markup → also image-led (441 posts end with no body) |
| Elementor/Yoast redirects exist | Yoast Premium redirect table is empty; site used plain `?p=ID` permalinks, no pretty URLs |

## 2. Architecture
Next.js 15 App Router · TypeScript · Tailwind 4 · Sanity v3 (Studio at `/studio`, own root layout) · Portable Text ·
ISR (5 min + webhook revalidation by tag) · Sanity CDN image loader (no Vercel image optimisation) · Vercel (`bom1`).

Routes: `/`, `/blog`, `/blog/page/n`, `/blog/<slug>`, `/category/<slug>[/page/n]`, `/tag/<slug>[/page/n]`, `/author/<slug>`, `/search?q=`, `/<page-slug>`, `/sitemap.xml`, `/robots.txt`, `/feed.xml`, `/api/{legacy,contact,revalidate}`.

## 3. Data model (deterministic ids)
`post-<wpId>` (WordPress drafts → `drafts.post-<wpId>`), `page-<wpId>`, `category-<termId>`, `tag-<termId>`, `author-<userId>`, `mediaAsset-<attachmentId>`, `menu-<termId>`, `siteSettings`.
Provenance (`wpPostId`, `wpStatus`, `sourceSlug`, `legacyUrl`, `sourceFormat`) stored read-only on each document. Asset `source.id` = WordPress attachment id.

## 4. Policies
- **Comments** (1,082, all unapproved): not migrated; archived locally. **Revisions** (806): not migrated; verified no published post lacks content that a revision holds. **Auto-draft 2723**: archive only.
- **Image-led posts** keep an empty body and render the featured image. No text is ever generated.
- **Slugs**: decoded NFC Marathi; mid-word truncated slugs rebuilt from the title at a word boundary; collisions get `-<id>`; original kept in `sourceSlug`.
- **Titles**: tags/entities stripped to plain text; raw value kept only in normalised data.
- **Unrepresentable HTML** → `rawHtml` block, sanitised at render (iframes only for allow-listed Amazon ad hosts). Only post 675 needs it.
- **Dates**: stored as UTC exactly as WordPress stored them (site timezone offset was 0) and displayed in UTC, so calendar dates match the old site.
- **Redirects**: middleware rewrites legacy query URLs to `/api/legacy/<kind>/<value>` which resolves against Sanity and answers 301; drafts/unknown → 404.
- **Safety**: import never deletes; edited documents are reported as conflicts; every script needs explicit `--project/--dataset`.

## 5. Phases
| Phase | Status |
|---|---|
| A Audit | VERIFIED |
| B Parser / normaliser / transform / tests | VERIFIED |
| C Pipeline (upload, bundle, validate, import, verify, report) | VERIFIED |
| 10-post test import (isolated dataset) | VERIFIED (see log) |
| Full rehearsal | VERIFIED in `qvtcbb1j/migration-test` |
| Frontend, SEO, redirects, Studio | VERIFIED locally (production build) |
| Production write to `mkiaioc7` | **BLOCKED — no write access** |
| Vercel preview | **BLOCKED — no Vercel CLI/credentials** |
| DNS / public cut-over | NOT STARTED (needs approval) |
