# Online24Taas — WordPress → Next.js / Sanity Migration
# Learner Guide: Work Completed to Date

| Item | Value |
|---|---|
| Site being migrated | **Online24Taas** — Marathi content site (`www.online24taas.com`, tagline *All Interesting Facts*) |
| WordPress source (READ-ONLY) | `/home/ravi/Projects/freelancing/online24taas/` |
| Target app (Next.js + Sanity) | `/home/ravi/Projects/freelancing/online24taas-web/` |
| Sanity project / dataset | `mkiaioc7` / `production` (apiVersion `2026-10-14`) |
| Document written | 2026-10-20 |
| Companion artifact | `PHASE_1_5_READINESS_REPORT.md` (audit written 2026-10-18) |

> **Scope of this document:** it records **only the steps that have already been carried out**, in detail — including the architecture decisions and the reasoning behind every piece of code written so far. **Future/remaining work is deliberately NOT included here.** All upcoming steps are tracked in a separate future-steps document maintained alongside this one.

---

## 1. The migration in one page

The original site is a classic **WordPress monolith**: PHP templates + a MySQL database (`wp_posts`, `wp_terms`, ...) + plugins (Yoast SEO, Jetpack, WP Rocket, Contact Form 7) served from shared hosting. The migration splits that monolith into two modern, decoupled parts:

```
                    ┌─────────────────────────────────────────────┐
                    │            MIGRATION SCRIPTS               │
   WordPress        │  (Node.js, in online24taas-web/scripts/)   │       Sanity.io
  ┌──────────┐      │                                             │     ┌──────────────┐
  │ APP-DATA │─────▶│  1. normalize  →  2. transform  →  3. seed │────▶│  Content Lake │
  │  .SQL    │      │     (SQL → JSON)   (HTML → Portable Text)  │     │  (documents)  │
  │ wp-content│     │                                             │     └──────┬───────┘
  │ /uploads │      └────────────────────────────────────────────┘            │ GROQ reads
  └──────────┘                      READ-ONLY source                          ▼
                                                              ┌──────────────────────────────┐
                                                              │  Next.js 15 (App Router)     │
                                                              │  • /studio  → embedded CMS   │
                                                              │  • frontend → renders content│
                                                              └──────────────────────────────┘
```

**In plain words:** WordPress is kept untouched as the *source of truth*. A set of small Node.js scripts reads the SQL dump, converts content into a clean intermediate JSON shape, transforms WordPress HTML into Sanity's **Portable Text** format, and seeds documents into a Sanity (headless CMS) project. Next.js is the presentation layer — it also embeds the Sanity Studio so editors can manage content at `/studio`.

**Content-first build order (the order actually executed so far):**

1. Take over & audit the WordPress source (never modify it).
2. Scaffold the Next.js app and wire it to a new Sanity project.
3. **Model the content** (schemas) — decide the shape of everything *before* importing anything.
4. Build the **transform pipeline** (WordPress HTML → Portable Text).
5. Build **safety tooling** around it (dry-run seeder, test harness).
6. Seed the safest, dependency-free data first (**taxonomy: authors/categories/tags**).
7. **Verify everything** (type-check, GROQ count probes, real-browser Studio test).
8. Run a formal **readiness audit** and write down every gap found (this is where work currently stands).

---

## 2. Part A — The WordPress source we took over

### A.1 Folder inventory (`/home/ravi/Projects/freelancing/online24taas/`)

| File / folder | Size | What it is |
|---|---|---|
| `APP-DATA.SQL` | 7.8 MB | **MySQL dump of the whole `wp_*` database** — the primary data source for the migration. |
| `APP-META.INI` | 3 KB | Hostinger backup manifest: WordPress version, DB name/prefix, installed plugins/themes, server paths. |
| `app_online24taas-com_My-blog_2025-09-30_22-22-24.tar.gz` | 684 MB | Full site archive (files + DB) taken 2025-09-30. |
| `wp-admin/`, `wp-includes/`, `wp-*.php` | — | WordPress core (v6.8.x), unmodified reference copy. |
| `wp-content/` | — | Themes, plugins and **`uploads/` (569 MB, years 2022–2025)** — all media files live here. |
| `.htaccess` | 8 KB | Apache rewrite rules of the old site (useful for understanding the old URL structure). |
| `filezillaa/` | — | Older FTP backups: `backup-online24taas.com-9-22-2024(.tar.gz)` + a `public_html` copy. |
| `online24taas.txt`, `online24taas.com credentials.jpg` | — | ⚠️ **Sensitive credential notes** (FTP/DB/logins). Kept only as reference; **never copied into the codebase, never quoted in documentation**. |
| `Unconfirmed 633112.crdownload` | 472 MB | An unrelated interrupted browser download in the folder — not part of the migration input. |

### A.2 What `APP-META.INI` told us

- **Installer:** Hostinger backup (`installer=wordpress`, `path=/home/.../public_html`).
- **WordPress:** `version=6.8.2` at backup time (auto-updated to 6.8.3 afterwards), DB `mysql`, table prefix `wp_`, **27 tables** (core + Yoast + Jetpack + WP Rocket + Action Scheduler tables).
- **Site identity:** title `Online24Taas`, tagline `All Interesting Facts`.
- **Active plugins:** `wordpress-seo 26.0` + `wordpress-seo-premium 21.8` (Yoast), `jetpack 15.0.2`, `jetpack-social`, `wp-rocket 3.15` (caching), `contact-form-7 6.1.2`, `really-simple-ssl`, `limit-login-attempts-reloaded`, `meta-tag-manager`, `insert-headers-and-footers`, `wp-letsencrypt-ssl`, `disable-right-click-rb`.
- **Deactivated (noted, not in play):** `elementor` — important finding: no Elementor page data to migrate.
- **Theme:** `adore-news 1.0.9` active (a news/magazine theme).

### A.3 The read-only rule

Everything under `online24taas/` is treated as **immutable source material**. All normalization/fixes (decoding slugs, stripping HTML from titles, ...) happen *in the pipeline on copies* — never by editing the dump or the WordPress files. This keeps the migration reversible and auditable: the pipeline can always be re-run against the original data.

---

## 3. Part B — Source data audit (what we learned from `APP-DATA.SQL`)

Every number below was **verified directly against the SQL dump** and cross-checked with the claims written in the schema comments (all matched ✅).

### B.1 Entity counts

| Entity | Count | Notes |
|---|---|---|
| Published posts | **660** | become `post` documents |
| Draft posts | 19 (+1 auto-draft) | not part of the migration surface |
| Published pages | **5** | about-us, privacy-policy, terms-and-conditions, disclaimer, + 1 suspicious |
| Media attachments | **799** | **all 799 files present locally** under `wp-content/uploads` (569 MB, 2022–2025) |
| Categories | **14** | |
| Tags | **89** | |
| Navigation menus | 2 (+12 `nav_menu_item` rows) | "top level menu" → categories, "social" → custom links |
| Users | **1** | user id `1` (single author) |
| Bodies containing Devanagari (Marathi) | **219** | published posts + pages |

### B.2 Body-format distribution (published posts + pages)

| Format | Count | Meaning |
|---|---|---|
| Gutenberg (`<!-- wp:... -->` comments) | **228** | every non-empty body is Gutenberg |
| Classic/legacy HTML | **0** | no true legacy-HTML content exists in this dataset |
| Empty `post_content` | **437** | **66% of published posts are image-only**: no Elementor data, no alternate content — just a featured image + metadata |

### B.3 Data-quality problems discovered in the source (found during audit; to be fixed *in the pipeline*, never at source)

1. **Percent-encoded slugs** — `659/660` post slugs, `13/14` category slugs, `57/89` tag slugs are URL-encoded (e.g. `%e0%a4%ab...` instead of `फिल्मी`). These were seeded into Sanity **verbatim** (confirmed live: `category-105.slug = %e0%a4%a8...`), so current slugs are unusable as URLs.
2. **437 image-only posts** (empty body) — verified genuinely empty (no `_elementor_data`; only `_thumbnail_id`/lock/Jetpack/Yoast meta). All 437 have a featured image.
3. **Titles contain raw HTML / escaped quotes** — e.g. post 78's title starts with `<strong>...</strong>`, post 105's title contains `\"...\"`. No script strips this yet.
4. **Yoast SEO carries no custom content** — **0 rows** of `_yoast_wpseo_title` and **0 rows** of `_yoast_wpseo_metadesc`; only scoring/ping metadata exists. So the SEO fields in the schema are mostly optional by design.
5. **Page anomalies** — page 592 (`श्रीमंत गंगामाई…`) looks like a misclassified post; pages 315/322/325/342 contain `<a>` anchors and `<h1>` tags (matters for the transform).


---

## 4. Part C — Target architecture & the design decisions behind it

### C.1 Stack (as pinned in `package.json`)

| Layer | Technology | Version | Role |
|---|---|---|---|
| Frontend framework | `next` (App Router) | ^15.1.0 | Rendering, routing, metadata |
| UI runtime | `react` / `react-dom` | ^19.0.0 | Components |
| Language | `typescript` | ^5.7.2 | Type safety (`strict: true`) |
| CMS studio | `sanity` + `@sanity/vision` | ^3.68.0 | Embedded Studio + GROQ playground |
| Studio bridge | `next-sanity` | ^9.8.0 | Next ↔ Sanity integration (embeds Studio, provides client) |
| Image URLs | `@sanity/image-url` | ^1.1.0 | Builds resized/cropped CDN URLs from image refs |
| Icons | `@sanity/icons` | ^3.5.0 | Schema/document icons in Studio |
| Styling (Studio) | `styled-components` | ^6.1.13 | Required by Sanity Studio's UI |

Deliberate choices:

- **No extra parser libraries** (no `@wordpress/block-serialization-default-parser`, no `html-react-parser`, etc.) — the transform is written dependency-free with plain string/regex parsing so it stays auditable and has no supply-chain surface.
- **Scripts are plain `.mjs` Node files**, not TS — they run directly with `node` without a build step.

### C.2 Folder layout (why it is shaped this way)

```
/home/ravi/Projects/freelancing/
├── online24taas/            # ← SOURCE: original WordPress (read-only, never edited)
│   ├── APP-DATA.SQL
│   ├── wp-content/uploads/  #    all 799 attachment files
│   └── ...
└── online24taas-web/        # ← TARGET: the new app (Next.js + Sanity)
    ├── .env.local           #    public Sanity ids; write token intentionally blank
    ├── next.config.mjs      #    image allow-list (cdn.sanity.io, www.online24taas.com)
    ├── package.json         #    npm scripts: dev/build/typecheck/validate/transform:test/seed:taxonomy
    ├── sanity.config.ts     #    Studio config (schema + plugins)
    ├── sanity.cli.ts        #    CLI project/dataset binding
    ├── scripts/             #    the migration pipeline (transform / test / seed)
    └── src/
        ├── app/
        │   ├── layout.tsx            # root layout, <html lang="mr">
        │   ├── page.tsx              # placeholder home
        │   └── (studio)/studio/[[...tool]]/
        │       ├── page.tsx          # server component: route config only
        │       └── studio.tsx        # 'use client': mounts NextStudio
        └── sanity/
            ├── client.ts             # anonymous read-only GROQ client
            ├── env.ts                # projectId/dataset/apiVersion from env
            ├── lib/image.ts          # urlFor() image builder helper
            └── schemaTypes/          # all 10 content models
                ├── index.ts          # single registry
                ├── documents/        # post, page, author, category, tag, mediaAsset, menu, redirect
                ├── objects/seo.ts
                └── blocks/blockContent.ts
```

**Why sibling folders:** keeps the 1 GB+ source completely separate from the app that must stay clean/dependency-light; nothing in `online24taas-web` ever writes into `online24taas/`.

### C.3 Key architecture decisions (and the reasoning)

| # | Decision | Why |
|---|---|---|
| D1 | **Headless split: Sanity = content, Next.js = presentation** | WordPress couples DB + templates + plugins; splitting lets content be migrated and edited independently of the frontend, removes PHP/hosting/plugin risk, and gives static/edge rendering. |
| D2 | **Deterministic document IDs** (`post-78`, `category-11`, `author-1`, `asset-13`, `menu-<ttid>`, `redirect-<hash>`) | Same input ⇒ same `_id` on every run, so imports are **idempotent** (re-runs update, never duplicate) and every Sanity doc can be traced back to its WordPress row. |
| D3 | **Keep WordPress IDs on every doc** (`wpPostId`, `wpTermId`, `wpUserId`, `wpAttachmentId`) | Reconciliation: count/compare source vs target; build redirect maps; debug mismatches. |
| D4 | **Dual body fields on post/page**: `body` (Portable Text) + `bodyHtml` (raw fallback) | PT is the clean editable representation; when legacy HTML cannot be safely converted, content is still never lost — raw HTML is stored in a dedicated field instead of polluting the PT array. |
| D5 | **`legacyUrl` field** (`https://www.online24taas.com/?p=<id>`) | The old WP permalink style `?p=123` must 301-redirect to the new `/blog/<slug>` later; storing the source URL on the doc makes the redirect map derivable from data. |
| D6 | **Redirects modeled as documents** (`redirect` type) | Keeps SEO-juice-preserving redirects as *data* (reversible, editable) instead of hardcoded server config. |
| D7 | **Weak references for menu items** (`weak: true`) | A menu can be created before the posts/pages it points to exist; weak refs allow forward references without breaking writes. |
| D8 | **SEO object mostly optional** | Audit showed Yoast had **0 custom titles/descriptions** — modelling them as required would invent data; frontend falls back to title/excerpt instead. |
| D9 | **`sourceFormat` enum** (`gutenberg` / `legacy-html` / `empty`) on every post/page | Makes the content mix queryable (the 437 empty posts, the 0 legacy ones) and lets the frontend/rendering behave differently per format. |
| D10 | **Studio embedded locally at `/studio`** via route group `(studio)` | Content modelling/validation during migration happens in the same app — no separate hosted Studio deployment to manage mid-migration. |
| D11 | **Anonymous, CDN-backed read client for the app**; write token only via env for scripts | Frontend reads are public by nature (useCdn: true, no token); writes are restricted to seeding scripts where the token is supplied per-run. |
| D12 | **Never auto-publish** during seeding | Nothing goes live from a script; published state is only ever changed deliberately. |

---

## 5. Part D — Step-by-step record of what was done

### Step 1 — Take over the WordPress backup

- Extracted the Hostinger app backup into `online24taas/`: DB dump (`APP-DATA.SQL`), manifest (`APP-META.INI`), full site tarball, and the `wp-content/uploads` media tree.
- Located older FTP backups under `filezillaa/` and the credential notes (`online24taas.txt`, credentials jpg) — recorded their existence but deliberately kept them out of the codebase and out of all documentation.
- Established the **read-only rule** for the whole folder (see A.3).

### Step 2 — Audit the database dump

- Parsed `APP-META.INI` for environment facts (WP version, DB prefix, plugin/theme inventory, table list).
- Queried `APP-DATA.SQL` to count every entity that the migration must cover (B.1) and to classify every published body by format (B.2).
- Checked Yoast meta tables (found no custom SEO content) and Elementor meta (absent ⇒ nothing to un-build from page builders).
- These verified numbers were then **baked into the schema comments** (e.g. “660 published + 19 drafts”, “14 categories in source”, “799 attachments”) so the models document their own source-of-truth statistics.

### Step 3 — Scaffold the Next.js application

- Created `online24taas-web` with Next.js 15 (App Router) + React 19 + TypeScript (`strict` mode), path alias `@/* → ./src/*`.
- Configured npm scripts in `package.json`:
  - `dev` / `build` / `start` — standard Next.js lifecycle.
  - `typecheck` → `tsc --noEmit` (validation gate used repeatedly).
  - `transform:test`, `seed:taxonomy`, `validate` — the migration tooling entry points (see Step 8–10 and note in H.2 about `validate`).
- Wrote `.gitignore` covering `node_modules/`, `.next/`, **all `.env*` variants**, `*.tsbuildinfo`, `.sanity/`, `dist/` — secrets can never be committed.
- Added `next.config.mjs` image `remotePatterns` allow-list: `cdn.sanity.io` (future Sanity CDN images) and `www.online24taas.com` (legacy originals during transition).


### Step 4 — Create the Sanity project & wire up configuration/env

- Created Sanity project **`mkiaioc7`**, dataset **`production`**, API version **`2026-10-14`**.
- The same triple is asserted in **four places** so nothing drifts:
  1. `sanity.config.ts` — Studio config (used by the embedded Studio), plus plugins `structureTool()` and `visionTool()`.
  2. `sanity.cli.ts` — `defineCliConfig` so CLI commands (`sanity schema deploy`, etc.) target the right project/dataset.
  3. `src/sanity/env.ts` — reads `NEXT_PUBLIC_SANITY_*` env vars with safe fallbacks; throws if project id is missing.
  4. `.env.local` — the actual values:
     ```
     NEXT_PUBLIC_SANITY_PROJECT_ID=mkiaioc7
     NEXT_PUBLIC_SANITY_DATASET=production
     NEXT_PUBLIC_SANITY_API_VERSION=2026-10-14
     SANITY_API_WRITE_TOKEN=        ← intentionally BLANK
     ```
- **Security model:** project id / dataset / apiVersion are *public identifiers*, not secrets (they ship to the browser anyway). The only real secret is the **write token**, which:
  - is git-ignored (all `.env*` excluded in `.gitignore`),
  - is **left blank** in the repo copy on purpose,
  - is read at runtime only by seed scripts (`process.env.SANITY_API_WRITE_TOKEN`),
  - is never hardcoded or logged anywhere.
- `src/sanity/client.ts` uses `createClient` from `next-sanity` **without a token** and `useCdn: true` — a read-only, cache-backed client for the frontend.

### Step 5 — Design the content model (10 schema types)

*Process:* first mapped every WordPress entity/table to a target type, then designed IDs/fields for **traceability and idempotency first**, aesthetics second. All types are registered in one place — `src/sanity/schemaTypes/index.ts` — grouped as `documents/`, `objects/`, `blocks/`.

| Schema type | File | Purpose (source entity) | Deterministic `_id` |
|---|---|---|---|
| `post` | `documents/post.ts` | 660 published WP posts | `post-<wpPostId>` |
| `page` | `documents/page.ts` | 5 published WP pages | `page-<wpPostId>` |
| `author` | `documents/author.ts` | WP users (1) | `author-<wpUserId>` |
| `category` | `documents/category.ts` | WP categories (14) | `category-<wpTermId>` |
| `tag` | `documents/tag.ts` | WP tags (89) | `tag-<wpTermId>` |
| `mediaAsset` | `documents/mediaAsset.ts` | WP attachments (799) — provenance wrapper | `asset-<wpAttachmentId>` |
| `menu` | `documents/menu.ts` | nav menus (2) + items | `menu-<wpTermTaxonomyId>` |
| `redirect` | `documents/redirect.ts` | legacy URL → new URL 301 map | `redirect-<hash>` |
| `seo` | `objects/seo.ts` | Yoast metadata object (embedded in post/page) | *(object, no id)* |
| `blockContent` (+ `rawHtml`) | `blocks/blockContent.ts` | Portable Text body definition | *(object/array type)* |

**Field design highlights:**

- **`post`**: `title`/`slug` (required), `publishedAt` (kept = WP `post_date`, explicitly documented as “preserved for traceability”), `modifiedAt`, `excerpt`, `body` (PT), `bodyHtml` (raw fallback), `featuredImage` (image + hotspot + `alt`/`caption`/`wpAttachmentId`), `author` (ref), `categories[]`/`tags[]` (refs), `sourceFormat`, `wpPostId`, `legacyUrl`, `seo` — plus an **SEO field group** so SEO fields collapse into one tab in Studio.
- **`page`**: same core shape minus author/category/tags/`caption` (pages in WP had none), routed at top-level URLs from its slug.
- **`category`/`tag`**: title + slug + description (category) + `wpTermId` — deliberately minimal.
- **`mediaAsset`**: wraps image *or* file plus `originalPath` (`2022/09/home.jpg`), `sourceUrl`, `alt`, `caption`, `wpAttachmentId` — i.e. full WP provenance for every attachment. (Note: at the current point in time, 0 `mediaAsset` docs exist and post/page images are plain `image` fields — see audit note H.2.)
- **`menu`**: inline `menuItem` array member with `label`, `type` enum (category/post/page/custom/internal), `url`, and a **weak** `ref` to category/post/page (decision D7).
- **`redirect`**: `source` (legacy path/`?p=id`), `destination` (new URL), `permanent` (default `true` = 301).
- **`blockContent`** (the Portable Text contract): styles `normal, h2…h6`; lists `bullet, number`; decorators `strong, em, underline`; members `block` + `image` (image carries `alt`, `caption`, `wpAttachmentId`). A separate `rawHtml` object type (`html` + `blockName`) exists for unconvertible fragments.
- **`seo`**: `seoTitle`, `metaDescription`, `canonicalUrl`, `focusKeyword`, `noIndex` (default false), `ogImage` — all optional, matching the audit finding that source Yoast data is auto-generated only (B.3/4).
- **Icons** from `@sanity/icons` on every type, and `preview.select` configured (title + slug + featured image) so lists are scannable in Studio.
- **Validation** is only applied where the source guarantees data (`required()` on titles/slugs) — never invent constraints the import cannot satisfy.

### Step 6 — Embed the Sanity Studio inside Next.js (and the RSC/client split)

Studio lives at **`/studio`** via a route group so it doesn't pollute URL structure:

```
src/app/(studio)/studio/[[...tool]]/
├── page.tsx   → Server Component: exports only route-segment config
└── studio.tsx → 'use client' Component: mounts <NextStudio config={config}/>
```

**Why the two-file split (the key lesson of this step):** `sanity.config.ts` imports the `sanity` package, which calls React's `createContext()` at module scope. Next.js **React Server Components** do not allow `createContext` on the server, so importing the config directly from a Server Component crashes the RSC layer. The fix:

- `studio.tsx` is the **client boundary** (`'use client'`) and is the *only* file that imports `sanity.config` + `NextStudio` ⇒ the `sanity` package is evaluated exclusively in the browser bundle.
- `page.tsx` stays a pure server file that just renders `<Studio/>`, and hosts the exports that are *only* legal in Server Components: `export const dynamic = 'force-static'`, `export const viewport` (device-width, `viewportFit: 'cover'` for Studio's notch CSS) and `export const metadata` (`referrer: 'same-origin'`, `robots: 'noindex'` — the CMS must never be indexed).

This structure was what eliminated the `createContext` errors / hydration mismatches observed before the split (re-verified in Step 11).

### Step 7 — Frontend foundation (minimal, by design)

At this stage the frontend is intentionally only a foundation — content rendering does not exist yet:

- `src/app/layout.tsx`: root layout sets **`<html lang="mr">`** (Marathi) and site metadata (`Online24Taas` / `All Interesting Facts — Marathi`). Choosing `lang="mr"` globally is correct because essentially all content is Devanagari.
- `src/app/page.tsx`: placeholder home page linking to `/studio`, explicitly stating that site pages come later — so nobody mistakes the scaffold for a finished frontend.
- `src/sanity/lib/image.ts`: `urlFor(source)` helper built on `@sanity/image-url` — the standard way to turn a Sanity image field into a sized CDN URL (`urlFor(doc.featuredImage).width(800).url()`).
- `src/sanity/client.ts` + `env.ts`: as described in Step 4 (read-only, CDN-backed).


### Step 8 — Build the content transform pipeline (`scripts/transform-pt.mjs`)

This is the heart of the migration: converting WordPress `post_content` into Sanity **Portable Text** blocks. Requirements that shaped it:

1. **Dependency-free** — plain Node string/regex parsing (no HTML libraries).
2. **Never silently drop content** — anything unrecognizable is *captured*, not discarded.
3. **Preserve Marathi verbatim** — Devanagari must pass through byte-for-byte (no entity/mojibake damage).
4. **Keep WP attachment IDs on images** so a later image-upload step can map files → Sanity assets.
5. **Be testable** — exports `transform()` and `flushUnmapped()` so both the test harness and future import code call the exact same logic; also usable as a CLI for quick file-level summaries.

> Full code walkthrough: **§7.1** below.

### Step 9 — Build the verification harness (`scripts/test-transform.mjs`)

A standalone Node script (`npm run transform:test`) that feeds **real posts** through `transform()` and asserts behaviour across representative scenarios: headings/paragraphs (post 2551), lists (post 78), inline image with `wpAttachmentId=13` (post 10), empty/legacy content (post 273), gallery with nested images (post 2687), `wp:html` iframe (post 675), plus a **bulk “no silent drop” guard over all 660 published posts** (must not throw; must not lose any Devanagari). It prints PASS/FAIL per check and exits non-zero on failure so it can gate pipelines.

> Full walkthrough + the later-discovered weaknesses of this suite: **§7.2** and **G.4**.

### Step 10 — Build & run the taxonomy seeder (`scripts/seed-taxonomy.mjs`)

First real write into Sanity, deliberately limited to **authors + categories + tags** (104 documents) — the entity types with no inbound dependency, so `post → author/category/tag` references will already resolve when posts arrive.

Design properties (the “safety first” pattern used for every seeder in this project):

- **Dry-run by default:** `--dry-run` *or a missing token* ⇒ the script only builds and prints the payload plan (counts, duplicate-id guard, sample docs) and exits — **no network writes possible by accident**.
- **Idempotent:** deterministic `_id`s + `createIfNotExist` (create) followed by `patch().set(...)` (fill fields) ⇒ rerunning never duplicates and always converges to the same content.
- **Explicit scope:** the log states “only author/category/tag were seeded. No posts/pages published.”
- **Token hygiene:** read from `SANITY_API_WRITE_TOKEN` env only; never printed; `@sanity/client` is imported *dynamically* so dry-runs need no dependency installed.
- **Transaction batching:** one Sanity transaction = one commit (atomic: all-or-nothing).
- **Duplicate-id guard:** payload is checked for repeated `_id`s *before* any write (exit 1 if found).

The seed was executed **live** (token supplied in the environment at run time), writing the 104 taxonomy docs — independently re-verified afterwards via unauthenticated GROQ (see Step 11).

> Full code walkthrough: **§7.3**.

---

### Step 11 — Run the verification round

Executed every gate available at that point: `tsc --noEmit`, dev-server route compilation, live GROQ probes of the seeded dataset, schema-vs-source count cross-checks, transform fixture + bulk tests, and a **real-browser (Playwright) load of `/studio`** to prove the embedded Studio hydrates cleanly. Full methods and results: **Part E (§6)**.

### Step 12 — Write the Phase 1.5 readiness audit (`PHASE_1_5_READINESS_REPORT.md`)

A formal, evidence-based assessment (dated 2026-10-18) of whether the project is ready to move on to importing posts. It re-verified the good parts (Studio health, config consistency, counts, seeded taxonomy, Marathi round-trip) and — more importantly — **catalogued every gap found** with severity: headline findings F1–F7, Portable-Text/schema violations G1–G8, missing pipeline artifacts, script status, and source data-quality issues. Full findings: **Part G (§8)**. This report is the current high-water mark of the migration: work stops at “audit completed, gaps documented”.

---

## 6. Part E — Verification performed so far

All of the following were actually run; results recorded in `PHASE_1_5_READINESS_REPORT.md` (2026-10-18):

| # | Check | Method | Result |
|---|---|---|---|
| V1 | TypeScript compiles | `npx tsc --noEmit` | ✅ exit 0, no errors |
| V2 | Dev server builds routes | `next dev` logs | ✅ `/studio/[[...tool]]` compiled (5460 modules) with no errors; `GET / 200`, `GET /studio 200` |
| V3 | Studio renders in a real browser | Playwright Chromium headless loaded `http://localhost:3000/studio`, 20 s hydration wait | ✅ HTTP 200; **zero** console errors, **zero** page errors, **zero** failed Sanity network requests; 48 Sanity UI nodes mounted; `bridge.js` loaded; login provider chooser visible; title “Online24Taas”. This proved the RSC/client split (Step 6) holds. |
| V4 | Dataset reachable without auth | anonymous GROQ `count(*)` | ✅ `104` total: `author=1, category=14, tag=89`, `post=0, page=0, mediaAsset=0, menu=0, redirect=0` |
| V5 | Seeded docs use intended IDs/fields | GROQ sample fetch | ✅ e.g. `_id: author-1` (`wpUserId: 1`), `category-11`, `category-105` (percent-encoded slug present, as recorded) |
| V6 | Schema claims == source reality | cross-check vs `APP-DATA.SQL` | ✅ every count matches (B.1); all 799 attachment files present on disk |
| V7 | Marathi survives the transform | fixture + bulk guard | ✅ Devanagari preserved verbatim; renders correctly through `@portabletext/react` at library level |
| V8 | Transform behavior on real posts | `node scripts/test-transform.mjs` with a real extract | ✅ prints `ALL TESTS PASS` — but see G.4: several assertions are too weak to catch known structural bugs |

**Explicitly NOT verified so far** (recorded as gaps, not attempted): authenticated Studio behavior (no login performed — write token blank), end-to-end Portable Text rendering *inside the app* (no rendering component exists in `src/` yet), production Studio build/deploy.

---

## 7. Part F — Code walkthroughs (how & why each script is written)

### 7.1 `scripts/transform-pt.mjs` — WordPress HTML → Portable Text

**Shape of the module:** pure helpers → two format-specific transformers → one public `transform()` entry → `flushUnmapped()` → optional CLI mode (`if (import.meta.url === file://...)`).

**Pipeline:**

```
content (string)
  ├─ empty / non-string ────────────────▶ { blocks: [], sourceFormat: 'empty' }
  ├─ contains '<!-- wp:' ───────────────▶ transformGutenberg(content)  → 'gutenberg'
  └─ otherwise ────────────────────────▶ transformLegacyHtml(content) → 'legacy-html'
```

**Helpers:**

- `decodeEntities(s)` — only the six entities actually present (`&amp; &lt; &gt; &quot; &#39; &nbsp;`); anything else is left untouched so Marathi text can't be mangled.
- `htmlToText(html)` — converts inline HTML to markdown-ish text: `<strong>/<b>` → `**…**`, `<em>/<i>` → `_…_`, strips `<u>`, `<br>` → newline, then removes all remaining tags and decodes entities.
- `parseInline(text)` — turns `**bold**` / `_em_` tokens into Portable Text **spans** with `marks: ['strong'|'em']`, each with a unique `_key`.
- `_key` generator `k()` — every PT node needs a unique `_key`; keys are `k<base36><random>` to survive merges into one document.
- `block(style, text, extra)` — factory for a standard `{_type:'block', _key, style, markDefs:[], children}` node.
- `imageFromHtml(innerHtml)` — regex-extracts `wp-image-<id>` (or JSON `"id":<n>`), `src`, `alt`, `<figcaption>` caption → returns `{wpAttachmentId, src, alt, caption}`.

**`transformGutenberg`** parses the Gutenberg comment syntax:

1. First pass: regex-find every opener `<!-- wp:<name> {json}? (-->|/-->); record `{name, json, index, after}`. Self-closing (`/-->`) markers are skipped.
2. Second pass: for each opener, slice `inner` = content up to the matching `<!-- /wp:<name> -->` (or EOF if unclosed).
3. Dispatch per block name:
   | Gutenberg block | Output |
   |---|---|
   | `paragraph` | one `block(style:'normal')` |
   | `heading` | `block('h'+level)` (level from the JSON attrs, default `h2`) |
   | `list` | split inner on `<!-- /wp:list-item -->` → one block per item with `listItem:'bullet'|'number'` (numbered if `<ol>` present) |
   | `list-item` | single list-item block (for older/list-item-comment style) |
   | `image` | `{_type:'image', wpAttachmentId, src, alt, caption, _needsAsset:true}` |
   | `html` (`wp:html`) | `{_type:'rawHtml', html}` — iframe/embed fragments preserved verbatim |
   | `code` | normal block + internal `_code` marker |
   | `gallery` | regex-pulls each nested `wp:image` out as its own image block; logs `layout grouping lost` to the unmapped log |
   | *anything else* | `{_type:'rawBlock', blockName, html, text}` **+** appended to the unmapped log → **never dropped** |
4. Fallback: if there were no Gutenberg openers at all (plain HTML stored in a Gutenberg-era post), split on blank lines/`<br>` into normal paragraphs.

**`transformLegacyHtml`** (classic editor path): splits on closing tags `</p|h1-6|li|div>`, keeps `<img>` pieces as image blocks, maps `<hN>` to style `hN`, everything else to `normal`.

**Anti-loss design:** the module-level `unmapped` array collects every unknown/lossy situation; `flushUnmapped()` appends them as NDJSON to `/tmp/.../unmapped-blocks.ndjson` so **every content compromise is auditable** after a run — this is what makes “never silently drop content” enforceable rather than aspirational.

**Known defects of this code as it stands today** (documented by the Phase 1.5 audit, recorded in §8 — e.g. list splitting, links, nested marks, `rawHtml`/`rawBlock` schema membership) — i.e. the file works as a *skeleton* but its output does not yet fully validate against the schema.


### 7.2 `scripts/test-transform.mjs` — the transform test harness

**Design:** imports `transform` + `flushUnmapped` directly from `transform-pt.mjs` (tests exercise the *real* code, not a copy), loads real WordPress rows from an intermediate `wp_posts.json` extract (row layout: `[id, ..., content@4, ..., status@7, ...type@20]`), and runs scenario suites:

| Suite | Post | What it asserts |
|---|---|---|
| `[A]` headings/paragraphs | 2551 | ≥1 heading block, ≥1 paragraph, Devanagari present with no mojibake (`�`/`Ã`/`â€`), `sourceFormat='gutenberg'` |
| `[B]` list | 78 | ≥1 block with `listItem` |
| `[C]` inline image | 10 | ≥1 `_type:'image'` block carrying `wpAttachmentId === 13` |
| `[D]` legacy/empty | 273 | `sourceFormat` is `legacy-html` or `empty`; transform doesn't throw |
| `[E]` gallery | 2687 | nested images extracted; every image has `wpAttachmentId` |
| `[E2]` wp:html iframe | 675 | preserved as `rawHtml` block containing `iframe` |
| `[F]` **bulk no-drop guard** | all 660 published | transform never throws; no post loses its Devanagari |

**Conventions:** a tiny `check(name, cond, detail)` helper prints `[PASS]/[FAIL]` and counts failures; `flushUnmapped()` is called at the end to persist the unknown-block audit log; the process **exits 1 on any failure** so CI/shell callers can gate on it.

*(Honest caveat recorded by the audit: some assertions are intentionally broad — e.g. `[B]` only checks “≥1 list block”, which cannot detect 6 `<li>` collapsing into 1 block. See G.4.)*

### 7.3 `scripts/seed-taxonomy.mjs` — the first live write into Sanity

**What it writes:** docs built from two intermediate normalized files:

```
/tmp/.../migration/normalized/users.json  →  {_id:'author-1', _type:'author', name, slug, wpUserId}
/tmp/.../migration/normalized/terms.json   →  {_id:'category-<tid>'|'tag-<tid>', title, slug, wpTermId}
```

**Execution flow:**

```
read env (projectId, dataset, token) + argv (--dry-run?)
  → buildDocs() from users.json + terms.json
  → print SEED PLAN (counts, duplicate-id guard, 1 sample doc/type)
  → if dry-run (flag OR no token): stop here — zero writes
  → else: dynamic import @sanity/client, build ONE transaction:
        for each doc:  createIfNotExist({_id,_type})   ← creates only if absent
        for each doc:  patch(_id).set(fields)          ← always converges fields
  → commit() → print result count + scope reminder
```

**Why this exact design (the reusable seeder pattern):**

1. **`createIfNotExist` + `patch().set()` instead of `createOrReplace`:** `createOrReplace` would wipe any manual editor changes on rerun; this combination **preserves unknown fields** while converging the ones we own — reruns are safe for both automation *and* humans.
2. **`dryRun = argv.includes('--dry-run') || !token`** — the script *fails safe*: forgetting the token cannot cause a half-run; it just degrades to a dry-run with a clear message.
3. **Duplicate-id guard prints before any write** — deterministic IDs are only idempotent if unique; a collision would mean corrupted normalization, so the run aborts (exit 1).
4. **Dynamic `import('@sanity/client')`** — dry-runs work in any checkout without installing runtime deps; dependency is only needed for the live path.
5. **Hard scope language in output** — the final log line (“only author/category/tag were seeded. No posts/pages published.”) makes it impossible to misread what a run did.
6. **No deletes, no publish calls anywhere** — the script structurally cannot remove content or make anything public (decision D12).

**Live result:** the seeder was run with a token and wrote **104 documents** (1 author + 14 categories + 89 tags) — independently confirmed afterwards by unauthenticated GROQ (V4/V5) showing exact per-type counts and deterministic IDs like `author-1`, `category-11`.


---

## 8. Part G — Findings recorded by the Phase 1.5 readiness audit

*These are the facts the audit (Step 12) established as of 2026-10-18. They describe the state of the system as-built; remediation is out of scope for this document and lives in the separate future-steps document.*

### G.1 Headline findings

| # | Finding | Severity |
|---|---|---|
| F1 | The referenced migration-plan artifact (`WORDPRESS_TO_SANITY_MIGRATION_PLAN.md`, expected under `/tmp/online24taas-audit/`) **does not exist anywhere on the filesystem** — no plan document was found under `/home` or `/tmp`. | 🔴 Blocking |
| F2 | **All normalized/intermediate migration data is missing** (`/tmp/.../migration/normalized/*`, `/tmp/.../intermediate/wp_posts.json`). Two of the three npm data scripts fail outright without it (ENoENT/MODULE_NOT_FOUND). | 🔴 Blocking |
| F3 | **Percent-encoded slugs were seeded verbatim** — 659/660 post, 13/14 category, 57/89 tag slugs URL-encoded in source and now stored encoded (confirmed live in Sanity, e.g. `category-105.slug = %e0%a4%a8...`). New URLs unusable until decoded. | 🔴 Blocking |
| F4 | **437/660 published posts (66%) have genuinely empty `post_content`** — verified image-only (all have a featured image; no Elementor/alternate content). | 🔴 Decision needed |
| F5 | **Transform output contains blocks the schema rejects**: `rawHtml`/`rawBlock` are not members of `body`; invalid list `style`; links dropped; `h1` unsupported — 8 concrete violations (G.2). | 🔴 Blocking |
| F6 | **Real-data demonstrations of corruption**: post 78 → 6 list items collapse to 1 block; nested `<strong><em><u>` leaves literal `_` in visible text. | 🔴 Blocking |
| F7 | **Studio `/studio` renders and hydrates with zero console/page/network errors** in real Chromium; taxonomy (104 docs) already seeded. | ✅ Good |

### G.2 Portable Text vs. schema violations (8, evidenced against real data)

| # | Gap | Evidence |
|---|---|---|
| G1 | **Links unsupported** — `blockContent.marks.annotations` is `[]`; the transform strips `<a href>` entirely | fixture: 2 anchors → 0 link annotations; real: pages 315/322/325/342 contain anchors |
| G2 | **`h1` style missing** from `styles` (normal, h2–h6 only) | pages 315/325 contain `<h1>`; `transformLegacyHtml` can emit `style:'h1'` |
| G3 | **Invalid list `style`** — transform sets `style:'bullet'/'number'` (a `listItem` value, not a valid *style*) | `@portabletext/react` warns “Unknown block style” |
| G4 | **List items merged** — transform splits on `<!-- /wp:list-item -->`, but real lists are `<ul><li>` | post 78: **6 `<li>` → 1 merged block** |
| G5 | **`rawHtml` not in `blockContent.of`** (only `block` + `image`) | post 675 (`wp:html` iframe) emits `_type:'rawHtml'` → schema-rejected |
| G6 | **`rawBlock` type doesn't exist in any schema** | emitted for unknown Gutenberg blocks; renderer: “Unknown block type rawBlock” |
| G7 | **Image blocks have no `asset`** and carry non-schema fields (`src`, `_needsAsset`) that are dropped on write | fixture image: `asset=MISSING` |
| G8 | **Nested marks corrupt text** — `<strong><em><u>` (post 78) leaves literal `_`, loses `em`/underline; bare `<u>` silently stripped | rendered output shows `_..._` with `marks=['strong']` |

> Also noted: `post.bodyHtml` (the raw-HTML fallback field) exists but **the transform never writes to it** — it emits `rawHtml`/`rawBlock` inside `body` instead; the comment in `blockContent.ts` claiming otherwise is inaccurate.

### G.3 Pipeline artifacts & script status (as found)

| Artifact / script | Status |
|---|---|
| Migration plan document | ❌ missing (F1) |
| `normalized/users.json`, `normalized/terms.json` | ❌ missing (F2) — **stored under `/tmp`, which did not survive reboots** |
| `intermediate/wp_posts.json` | ❌ missing (F2) — a *temporary 6-post extract* (posts 78, 10, 273, 675, 2551, 2687) was generated only to run the transform tests |
| `unmapped-blocks.ndjson` | ❌ missing |
| `npm run validate` (`scripts/validate-normalized.mjs`) | ❌ **MODULE_NOT_FOUND — the script referenced in `package.json` was never created** |
| `npm run seed:taxonomy --dry-run` | ❌ ENoENT (needs `normalized/users.json`) |
| `npm run transform:test` | ❌ without the extract; ✅ `ALL TESTS PASS` when supplied a real extract (but weak assertions — G.4) |
| `npx tsc --noEmit` | ✅ clean |

### G.4 Test-suite weaknesses (why “ALL TESTS PASS” was misleading)

- `[B]` asserts `items >= 1`; post 78's 6 items collapsing to 1 block still passes vacuously (G4 undetected).
- `[F]` bulk guard checks only “no throw” + “no Devanagari lost” — it never validates output **structure against the schema**, so G1–G8 pass undetected.
- No assertion covers link preservation, mark fidelity, list-splitting counts, or schema membership of `_type`s.

### G.5 Source data-quality issues (recap — must be handled in normalization, never at source)

1. Percent-encoded slugs (F3) — including the 104 already-seeded taxonomy docs.
2. 437 image-only empty-body posts (F4) — 66% of published posts, not an edge case.
3. Titles with raw HTML/escaped quotes (post 78, 105) — no script strips them today.
4. Page 592 looks misclassified; pages 315/322/325/342 have anchors + `<h1>` (→ G1/G2).
5. Format reality: 228 Gutenberg / 0 legacy / 437 empty — the transform's `legacy-html` path has **no true representatives** in this dataset.

### G.6 Also verified as healthy ✅

- Config consistency across all 4 sources (project/dataset/apiVersion); no credentials exposed; anonymous client only.
- `tsc --noEmit` clean; Studio HTTP 200 + clean real-browser hydration (V2/V3).
- All schema-comment counts match the dump; all 799 attachment files present locally.
- Taxonomy seeded with correct deterministic IDs; Marathi Unicode survives transform + renders.

### G.7 Explicitly unverified at audit time

- Authenticated Studio behavior (no login performed; write token blank).
- End-to-end Portable Text rendering **inside the app** (no rendering component exists in `src/` — only library-level rendering was tested).
- Hosted/production Studio build.

---

## 9. Part H — Current state snapshot (as of this writing)

### H.1 What exists and works

| Area | State |
|---|---|
| Source WordPress folder | ✅ intact, read-only, never modified |
| Next.js app | ✅ builds; `/` placeholder + `/studio` embedded; `lang="mr"` |
| Sanity project | ✅ `mkiaioc7`/`production` reachable; Studio hydrates cleanly |
| Schemas (10 types) | ✅ registered and deployable; `tsc` clean |
| Seeded content | ✅ **104 docs**: 1 author + 14 categories + 89 tags (deterministic IDs, `wpTermId`/`wpUserId` provenance) |
| Transform + tests + seeder | ✅ code exists and runs (with data present); ⚠️ known defects G.2/G.4 |
| Verification evidence | ✅ V1–V8 in Part E |
| Audit report | ✅ `PHASE_1_5_READINESS_REPORT.md` |

### H.2 What does NOT exist yet (stated as current facts only)

- No migration-plan document; no normalized/intermediate data files (lost with `/tmp`); `scripts/validate-normalized.mjs` referenced by `package.json` was never created.
- **0 posts, 0 pages, 0 mediaAsset, 0 menus, 0 redirects** in Sanity (GROQ-verified).
- No frontend routes/components for content (no post page, no Portable Text renderer in `src/`); homepage is a placeholder.
- No image uploads to Sanity; no write token stored in `.env.local` (blank by design).
- The repo is **not yet under git** (`.gitignore` prepared, but no `.git` initialized — nothing committed).


---

## 10. Part I — Conventions & principles used throughout the work

These rules were applied consistently in every file written so far; they are the “style guide” of this migration:

1. **Source immutability** — never edit `online24taas/`; fix data in the pipeline on copies.
2. **Deterministic identity** — every migrated doc gets `_id = <type>-<wpId>` so all runs converge on the same documents (idempotency over uniqueness).
3. **Provenance everywhere** — keep `wpPostId/wpTermId/wpUserId/wpAttachmentId/wpAttachmentId`, `legacyUrl`, `originalPath` so any doc can be traced to its WordPress origin.
4. **Idempotent writes** — `createIfNotExist` + `patch().set()` (or `createOrReplace` keyed on deterministic ids); reruns must be safe and non-destructive.
5. **Fail-safe writes** — dry-run by default; a missing token ⇒ no-op, not a partial run; duplicate-ID guard before any network call.
6. **Never publish, never delete** from scripts — publish state changes only by explicit human action.
7. **Never silently drop content** — unknown constructs are captured (`rawHtml`/`rawBlock` + `unmapped-blocks.ndjson` audit log) rather than discarded.
8. **Marathi is sacred** — narrow entity decoding only; tests assert Devanagari round-trips byte-for-byte (no mojibake: `�`, `Ã`, `â€`).
9. **Secrets never in code** — token only via env; `.env*` git-ignored; public identifiers (project/dataset) clearly separated from secrets; credentials notes never copied into the repo.
10. **Validate against reality** — every claim in schema comments and tests is cross-checked against `APP-DATA.SQL` and the live dataset (GROQ counts), not assumed.
11. **RSC hygiene** — anything touching the `sanity` package lives behind a `'use client'` boundary; route-segment config only in Server Components.
12. **Dependency minimalism** — transform code is dependency-free; scripts are plain `.mjs`; each new package must justify itself.
13. **Documentation as evidence** — findings recorded in `PHASE_1_5_READINESS_REPORT.md` with reproducible evidence (commands, fixtures, browser probe output).

---

## 11. Part J — File map & command reference

### J.1 Every file created so far (and its role)

| File | Role |
|---|---|
| `package.json` | deps + 6 npm scripts (`dev`, `build`, `start`, `typecheck`, `validate`, `transform:test`, `seed:taxonomy`) |
| `next.config.mjs` | image `remotePatterns` allow-list: `cdn.sanity.io`, `www.online24taas.com` |
| `tsconfig.json` | strict TS, ES2022, bundler resolution, `@/*` alias |
| `.env.local` | public Sanity ids + blank write-token slot |
| `.gitignore` | ignores `node_modules/`, `.next/`, all `.env*`, `*.tsbuildinfo`, `.sanity/`, `dist/` |
| `sanity.config.ts` | Studio config: name/title, project/dataset, `structureTool` + `visionTool`, schema registry |
| `sanity.cli.ts` | CLI binding to project `mkiaioc7` / dataset `production` |
| `src/sanity/env.ts` | env-based projectId/dataset/apiVersion with fallbacks + guard |
| `src/sanity/client.ts` | anonymous `next-sanity` client (`useCdn: true`, no token) |
| `src/sanity/lib/image.ts` | `urlFor()` image-URL builder |
| `src/sanity/schemaTypes/index.ts` | single schema registry (10 types) |
| `src/sanity/schemaTypes/documents/post.ts` | post model (see Step 5) |
| `src/sanity/schemaTypes/documents/page.ts` | page model |
| `src/sanity/schemaTypes/documents/author.ts` | author model |
| `src/sanity/schemaTypes/documents/category.ts` | category model |
| `src/sanity/schemaTypes/documents/tag.ts` | tag model |
| `src/sanity/schemaTypes/documents/mediaAsset.ts` | attachment provenance wrapper (0 docs yet) |
| `src/sanity/schemaTypes/documents/menu.ts` | nav menu + weak-ref items (0 docs yet) |
| `src/sanity/schemaTypes/documents/redirect.ts` | redirect map doc type (0 docs yet) |
| `src/sanity/schemaTypes/objects/seo.ts` | SEO object + shared `seoFields` spread |
| `src/sanity/schemaTypes/blocks/blockContent.ts` | Portable Text contract + `rawHtml` type |
| `src/app/layout.tsx` | root layout: `<html lang="mr">`, site metadata |
| `src/app/page.tsx` | placeholder homepage linking to `/studio` |
| `src/app/(studio)/studio/[[...tool]]/page.tsx` | Studio route (server): `dynamic`, `viewport`, `noindex` metadata |
| `src/app/(studio)/studio/[[...tool]]/studio.tsx` | Studio mount (client boundary) |
| `scripts/transform-pt.mjs` | WP HTML → Portable Text transformer (see §7.1) |
| `scripts/test-transform.mjs` | transform test harness (see §7.2) |
| `scripts/seed-taxonomy.mjs` | idempotent author/category/tag seeder (see §7.3) |
| `PHASE_1_5_READINESS_REPORT.md` | Phase 1.5 audit report (source of Part G) |
| `MIGRATION_LEARNER_GUIDE.md` | this document |

### J.2 Command reference (all executed during the work so far)

```bash
# Type-check gate
npx tsc --noEmit                 # (= npm run typecheck)

# Dev server + manual checks
npm run dev                      # then GET / (200), GET /studio (200)

# Transform tests (requires intermediate/wp_posts.json extract)
npm run transform:test            # → PASS/FAIL lines; exit 1 on failure

# Taxonomy seeding
node scripts/seed-taxonomy.mjs --dry-run              # payload plan, no writes
SANITY_API_WRITE_TOKEN=... node scripts/seed-taxonomy.mjs   # live write (104 docs)

# Data validation (declared in package.json; script file not yet created — see G.3)
npm run validate
```

---

## 12. Glossary (WordPress ↔ Sanity)

| WordPress term | Sanity term used here |
|---|---|
| `wp_posts` row (post/page) | `post` / `page` document (`_id: post-<ID>`) |
| `post_content` (Gutenberg HTML) | Portable Text `body` (via `transform-pt.mjs`) |
| `post_content` (unconvertible HTML) | `bodyHtml` / `rawHtml` block |
| `wp_users` | `author` document |
| `wp_terms` + `wp_term_taxonomy` (category/tag) | `category` / `tag` documents |
| `_thumbnail_id` → attachment | `featuredImage` (image + `wpAttachmentId`) |
| `wp_posts` attachments (799 files) | Sanity assets (via `mediaAsset` provenance docs) |
| Yoast meta (`_yoast_wpseo_*`) | `seo` object on post/page |
| Nav menu (`nav_menu` + `nav_menu_item`) | `menu` document with `menuItem[]` |
| Permalink `?p=123` | `legacyUrl` field + `redirect` document |
| WP “slug” (URL-encoded!) | `slug.current` (currently stored verbatim — see F3) |
| MySQL table | Sanity Content Lake (schemaless documents, GROQ queries) |
| WP theme templates | Next.js App Router routes/components |
| `wp-admin` editor | Embedded Sanity Studio at `/studio` |

---

*End of learner guide. This document reflects completed work only; upcoming work is intentionally excluded and tracked separately.*
