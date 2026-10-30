# PHASE 1.5 — Sanity Studio & Schema Readiness Report

**Project:** `online24taas-web` (`/home/ravi/Projects/freelancing/online24taas-web`)
**Sanity project/dataset:** `mkiaioc7` / `production` (apiVersion `2026-10-14`)
**Original WordPress backup (read-only, untouched):** `/home/ravi/Projects/freelancing/online24taas/`
**Report date:** 2026-10-18
**Status: ⛔ NOT READY for the 10-post test import.** Studio is healthy; schemas and the transform pipeline have blocking gaps (§2, §3), and the migration plan + normalized data the task depends on do not exist (§3).

---

## 0. Headline findings (read first)

| # | Finding | Severity |
|---|---------|----------|
| F1 | **`/tmp/online24taas-audit/WORDPRESS_TO_SANITY_MIGRATION_PLAN.md` does not exist**, nor does any migration plan anywhere on the filesystem. The audit baseline this phase was to compare against is absent. | 🔴 Blocking |
| F2 | **All normalized/intermediate migration data is missing** (`/tmp/online24taas-work/migration/normalized/*`, `.../intermediate/wp_posts.json`). Two of three `package.json` scripts fail outright. | 🔴 Blocking |
| F3 | **659/660 post slugs, 13/14 category slugs, 57/89 tag slugs are URL-percent-encoded in the WordPress source** and were already seeded into Sanity verbatim (e.g. `category-5` slug = `%e0%a4%ab...`). New URLs are unusable until decoded. | 🔴 Blocking |
| F4 | **437/660 published posts (66%) have genuinely empty `post_content`** — image-only posts (all 437 have a featured image, no Elementor/alternate content). A policy decision is required before import. | 🔴 Blocking (decision) |
| F5 | **Portable Text transform emits blocks the schema rejects**: `rawHtml` and `rawBlock` are not members of `body`; list items get an invalid `style`; links are dropped; `h1` is unsupported. 8 concrete violations found (§2.3). | 🔴 Blocking |
| F6 | **Percent-encoded / merged / underscore-leak bugs are real on real data** — demonstrated on post 78 (6 list items → 1 block; `<u>`/nested marks leak literal `_`). | 🔴 Blocking |
| F7 | Studio `/studio` renders and **hydrates with zero console/page errors** in a real browser; login screen appears. Taxonomy (1 author + 14 categories + 89 tags = 104 docs) is already seeded. | ✅ Good |

## 1. Studio functionality — ✅ VERIFIED (with one caveat)

### 1.1 Configuration
| Item | Value | Verified |
|------|-------|----------|
| `projectId` | `mkiaioc7` | ✅ consistent across `sanity.config.ts`, `sanity.cli.ts`, `src/sanity/env.ts`, `.env.local` |
| `dataset` | `production` | ✅ same 4 sources |
| `apiVersion` | `2026-10-14` | ✅ |
| Write token | `SANITY_API_WRITE_TOKEN` **blank (0 chars)** in `.env.local` | ✅ no credentials committed; correctly git-ignored |
| Client token exposure | `src/sanity/client.ts` uses anonymous client (`useCdn: true`, no token) | ✅ correct |

### 1.2 Real browser check (Playwright Chromium — actually performed)
Method: installed Playwright + Chromium headless shell, loaded `http://localhost:3000/studio`, waited 20 s for hydration, captured console errors, uncaught page errors, failed Sanity network requests, and probed the DOM.

```
httpStatus        : 200
consoleErrors     : []        <- none
pageErrors        : []        <- none
requestsFailed    : []        <- no failed sanity/bridge requests
sanityUiElements  : 48        <- Sanity UI tree mounted (data-ui selectors)
sanityCoreScript  : true      <- bridge.js loaded (data-sanity-core)
loginDetected     : true      <- "Choose login provider: Google / GitHub / E-mail"
elementCount      : 126
title             : "Online24Taas"
```

**Conclusion:** the Studio mounts and hydrates cleanly. The RSC/client split fixed in the prior phase (`studio.tsx` as the `'use client'` boundary) holds — no `createContext` errors, no hydration mismatch, no failed asset loads.

### 1.3 Server logs
`next dev` compiled `/studio/[[...tool]]` (5460 modules) with **no errors**; `GET / 200`, `GET /studio 200`.

### 1.4 Auth / dataset reachability
- Public (unauthenticated) GROQ probe succeeded: `count(*) = 104`.
- Per-type: `author=1`, `category=14`, `tag=89`, `post=0`, `page=0`, `mediaAsset=0`, `menu=0`, `redirect=0`.
- Seeded docs use the intended deterministic IDs (`author-1`, `category-5`, …) and carry `wpTermId`/`wpUserId`.

### ⚠️ Unverified
- **I could not authenticate into Studio** (no credentials available; write token intentionally blank). Therefore **authenticated Studio behaviour is unverified**: document creation/editing UI, validation error display, field previews, and the Vision tool against real data. The screen currently shown is the login provider chooser.
- Production (`sanity build` / hosted Studio) deployment is out of scope and unverified.

## 2. Schema audit — ⛔ GAPS FOUND

Compared against `WORDPRESS_TO_SANITY_MIGRATION_PLAN.md`: **file not found** (F1). The comparison below is therefore against the task's own requirement list (posts, pages, authors, categories, tags, SEO, Marathi, Portable Text, featured/inline images, WP IDs, publication dates) and against the real source data.

### 2.1 Requirement coverage

| Requirement | Schema support | Verdict |
|---|---|---|
| Posts | `post` type, `_id: post-<wpPostId>`, `/blog/<slug>` | ✅ |
| Pages | `page` type, `_id: page-<wpPostId>` | ✅ |
| Authors | `author`, `_id: author-<wpUserId>`; 1 source user | ✅ |
| Categories | `category`, `_id: category-<wpTermId>`; 14 in source | ✅ |
| Tags | `tag`, `_id: tag-<wpTermId>`; 89 in source | ✅ |
| SEO metadata | `seo` object on post+page | ✅ (but see 2.5 — source has 0 custom values) |
| Marathi Unicode | no schema constraint blocks Devanagari; `lang="mr"` set | ✅ |
| Portable Text | `blockContent` array | ⛔ gaps — 2.3 |
| Featured images | `image` + hotspot + `alt/caption/wpAttachmentId` | ✅ |
| Inline images | `image` member in `blockContent` | ⛔ no `asset` wiring — 2.3 |
| Source WP IDs | `wpPostId`, `wpTermId`, `wpUserId`, `wpAttachmentId`, `legacyUrl` | ✅ |
| Publication dates | `publishedAt`/`modifiedAt` (`datetime`) | ✅ |
| Redirects | `redirect` type (Phase 5) | ✅ schema ready, 0 docs |
| Menus | `menu` + weak `menuItem.ref` | ✅ schema ready, 0 docs |
| Media wrapper | `mediaAsset` | ⚠️ present but currently orphaned — 2.4 |

### 2.2 Reference & ID suitability — ✅
- Deterministic IDs are consistent between schema comments, `seed-taxonomy.mjs`, and what is already in the dataset (`author-1`, `category-5`, …). Rerun-safe via `createOrReplace`/`createIfNotExist`.
- References: `post.author → author`, `post.categories[] → category`, `post.tags[] → tag`. `menu.items[].ref` is correctly `weak: true` (targets may not exist yet).
- **All references are resolvable today** because taxonomy was seeded first.

### 2.3 Portable Text gaps (blocking) — `src/sanity/schemaTypes/blocks/blockContent.ts`
Validated the real transform output against the schema. **8 violations:**

| # | Gap | Evidence | Impact |
|---|-----|----------|--------|
| G1 | **Links unsupported** — `marks.annotations: []`; transform drops `<a href>` entirely (`htmlToText` strips anchors, `parseInline` only handles `**`/`_`). | Fixture: 2 `<a>` → 0 link annotations. Real data: **4 pages** (315, 322, 325, 342) contain anchors. | 🔴 Silent link loss |
| G2 | **`h1` style missing** — `styles` = normal, h2…h6. | Real data: **2 pages** (315, 325) contain `<h1>`; `transformLegacyHtml` can emit `style:'h1'`. | 🔴 Validation error |
| G3 | **Invalid list `style`** — transform sets `style:'bullet'/'number'`, which is not in `styles`. | `@portabletext/react` warns *"Unknown block style bullet/number"*. | 🔴 PT validation error |
| G4 | **List items merged** — transform splits on `<!-- /wp:list-item -->`, but real lists use `<ul><li>`. | Real post 78: **6 `<li>` → 1 merged block**. | 🔴 Content corruption |
| G5 | **`rawHtml` not a member of `body`** — `blockContent.of = [block, image]` only. | Real post 675 (`wp:html` iframe) emits `_type:'rawHtml'` → rejected by schema. | 🔴 Write rejection |
| G6 | **`rawBlock` type does not exist anywhere in schema** — emitted for unknown Gutenberg blocks. | `@portabletext/react`: *"Unknown block type rawBlock"*; renders as hidden placeholder. | 🔴 Write rejection |
| G7 | **Image blocks have no `asset`** and carry non-schema fields `src`,`_needsAsset`. | Fixture image: `asset=MISSING`. Extra fields dropped on write, so the `src` needed for Phase-3 upload is lost. | 🔴 Images won't render |
| G8 | **Nested marks corrupt text** — `<strong><em><u>` (real post 78) leaves **literal `_` in visible text** and loses `em`/`underline`. `<u>` alone is silently stripped. | Rendered HTML shows `_..._` with `marks=['strong']`. | 🔴 Visible corruption |

> Note: `post.bodyHtml` exists as a raw-HTML fallback field, but **the transform never writes to it** — it emits `rawHtml`/`rawBlock` *inside* `body` instead. The comment in `blockContent.ts` ("preserved via the rawHtml block (see post.ts)") is inaccurate on both counts.

### 2.4 `mediaAsset` is orphaned
`mediaAsset` (799 attachments in source) has 0 documents and **no reference to it from `post`/`page`/`blockContent`**. Inline/featured images are plain `image` fields resolved by upload, not by reference. Either `mediaAsset` is dead weight or image provenance must be re-wired — needs a decision.

### 2.5 SEO — ✅ but data-poor
Confirmed the `seo.ts` comment against the dump: **0 rows** of `_yoast_wpseo_title` and **0 rows** of `_yoast_wpseo_metadesc`. Yoast keys present are only scoring/ping metadata (`primary_category`, `focuskeywords`, `content_score`, `indexnow`, …). The optional SEO fields are correct in shape; there is essentially no custom SEO content to migrate.

## 3. Normalized migration data & scripts — ⛔ MISSING / FAILING

### 3.1 Missing artifacts
| Artifact | Status |
|---|---|
| `/tmp/online24taas-audit/WORDPRESS_TO_SANITY_MIGRATION_PLAN.md` | ❌ **does not exist** (dir absent) |
| Any `*MIGRATION*PLAN*.md` under `/home` or `/tmp` | ❌ none found |
| `/tmp/online24taas-work/migration/normalized/users.json` | ❌ missing |
| `/tmp/online24taas-work/migration/normalized/terms.json` | ❌ missing |
| `/tmp/online24taas-work/migration/intermediate/wp_posts.json` | ❌ missing (I generated a temporary extract for testing only) |
| `/tmp/online24taas-work/migration/unmapped-blocks.ndjson` | ❌ missing |

### 3.2 Script status
| Script | Result |
|---|---|
| `npm run validate` (`scripts/validate-normalized.mjs`) | ❌ **MODULE_NOT_FOUND** — the script referenced in `package.json` was never created |
| `npm run seed:taxonomy --dry-run` | ❌ **ENOENT** on `normalized/users.json` |
| `npm run transform:test` | ❌ fails without `intermediate/wp_posts.json`. When I supplied a real extract, it printed **ALL TESTS PASS** — but the assertions are too weak (3.4) |
| `npx tsc --noEmit` | ✅ exit 0, no type errors |

### 3.3 Source counts — ✅ all schema comments verified against `APP-DATA.SQL`
| Entity | Claimed in schema | Actual in source | Match |
|---|---|---|---|
| Published posts | 660 | 660 | ✅ |
| Draft posts | 19 | 19 (+1 auto-draft) | ✅ |
| Pages | 5 | 5 | ✅ |
| Attachments | 799 | 799 (**all 799 files present locally**, 569 MB) | ✅ |
| Categories | 14 | 14 | ✅ |
| Tags | 89 | 89 | ✅ |
| Nav menus | 2 | 2 (+12 `nav_menu_item`) | ✅ |
| Users | 1 | 1 (`latake10`, id=1) | ✅ |
| Devanagari content | — | 219 published post+page bodies | ✅ |

### 3.4 Test-suite weaknesses (`scripts/test-transform.mjs`)
`ALL TESTS PASS` is misleading:
- **[B] List** asserts `items >= 1`. Real post 78 has **6** items collapsed into **1** block — the test passes vacuously (G4 undetected).
- **[F] Bulk guard** checks only "no throw" + "no Devanagari lost". It never validates output **structure against the schema**, so G1–G8 all pass undetected.
- No assertion covers links, marks fidelity, list splitting, or schema membership.

### 3.5 Data-quality issues in the source (do not modify source; fix in normalization)
1. **Percent-encoded slugs (F3)** — 659/660 posts, 13/14 categories, 57/89 tags. Already in Sanity verbatim (`category-5.slug = "%e0%a4%ab%e0%a4%bf%e0%a4%b2%e0%a5%8d%e0%a4%ae%e0%a5%80"` → should be `फिल्मी`). **Must URL-decode during normalization.**
2. **437/660 published posts have empty `post_content` (F4)** — verified genuinely empty: no `_elementor_data`; only `_edit_lock`, `_thumbnail_id`, Jetpack/Yoast meta. All 437 have a featured image → **image-only posts**. The test suite's "post 273 is effectively empty" framing understates this: it is **66% of published posts**, not an edge case.
3. **Titles contain raw HTML and escaped quotes** — post 78 title = `<strong>लम्पी व्हायरसचा धुमाकूळ</strong>…`; post 105 title = `\"घरातून गरिबी दूर करण्याचा जालीम उपाय\"`. Titles need HTML-strip + entity decode; **no script does this today**.
4. **Page slugs are clean** (`privacy-policy`, `terms-and-conditions`, `disclaimer`, `about-us`) but page 592 (`श्रीमंत गंगामाई…`) looks like a misclassified post, and pages 315/322/325/342 contain anchors + `<h1>` (G1/G2).
5. **Format reality check:** of published post+page bodies, **228 Gutenberg / 0 true legacy-HTML / 437 empty**. Every non-empty body is Gutenberg; the `legacy-html` path in the transform is effectively dead for this dataset, and the task's "legacy HTML" test category has no true representatives.

## 4. Content rendering test — ⚠️ LIBRARY-LEVEL ONLY

### 4.1 No frontend rendering components exist
`src/app` contains **only** the `(studio)` route and a root placeholder page. There is **no post/page route, no `PostBody` component, and no `@portabletext/react` usage anywhere in `src/`**. `@portabletext/react` is installed transitively via `next-sanity`, but nothing renders Portable Text yet.

**Therefore end-to-end rendering in the app cannot be verified — no such component exists to test.**

### 4.2 Fixture + transform + render (performed)
Created a Marathi fixture at `/tmp/online24taas-work/fixtures/marathi-article.json` containing H2/H3, paragraphs, `strong`/`em`/`underline`, bulleted + numbered lists, an inline link, an inline image with caption, a `wp:html` iframe, and an unknown block.

- **Transform** → 9 blocks (`fixtures/transform-output.json`), `sourceFormat=gutenberg`.
- **Schema validation** → **8 issues** (G1–G8, §2.3).
- **Render** via `renderToStaticMarkup(<PortableText/>)` → HTML produced. Verified working: `<h2>`, `<h3>`, `<strong>`, `<em>`, `<ul>/<ol>`, `<img>`, Marathi preserved verbatim. Confirmed broken: **no link markup** (dropped), **list items merged into one `<li>`**, `rawBlock` unknown (hidden placeholder + console warning), `rawHtml` requires a custom component (and is not schema-valid anyway), `<u>` underline dropped.

So: **the intended PT structures render correctly only for headings, paragraphs, bold, and italic.** Lists, links, underline, unknown blocks, and images are all lossy or invalid.

## 5. Next safe migration test — PLAN (10 posts) — **DO NOT RUN YET**

### 5.1 Candidate batch (representative + deterministic)
Chosen to exercise every code path and known bug. IDs are WordPress post IDs → Sanity `_id = post-<id>`.

| WP ID | Why included | Format | Featured image | Local file? |
|---|---|---|---|---|
| 78 | list (6 items) + nested marks + HTML title | gutenberg | none (inline img only) | inline only |
| 10 | inline image w/ `wpAttachmentId=13` | gutenberg | none | inline only |
| 2687 | gallery w/ nested images | gutenberg | 2688 | ✅ |
| 675 | `wp:html` iframe → `rawHtml` (G5) | gutenberg | 678 | ✅ |
| 2551 | headings + list + image | gutenberg | 2552 | ✅ |
| 273 | **empty body / image-only** (F4 cohort) | empty | 274 | ✅ |
| 353 | **empty body / image-only** (F4 cohort) | empty | 354 | ✅ |
| 89 | image post | gutenberg | 135 | ✅ |
| 92 | image post | gutenberg | 132 | ✅ |
| 105 | escaped-quote title | gutenberg | 134 | ✅ |

All 799 attachment files exist under `wp-content/uploads` (2022–2025), so image mapping for this batch is feasible from local files.

### 5.2 Prerequisites — ALL must be resolved first
1. **Recover or author the migration plan** and **regenerate normalized data** (`users.json`, `terms.json`, `wp_posts.json` intermediate). Two scripts currently fail without them (F1, F2).
2. **Fix slug percent-encoding** — URL-decode post/category/tag slugs during normalization; re-seed the 104 already-seeded taxonomy docs (F3).
3. **Fix transform list handling** — split on `<li>`, emit `style:'normal'` + `listItem:'bullet'|'number'` (G3, G4).
4. **Add a link annotation** to `blockContent.marks.annotations` **or** explicitly accept link loss and record it (G1).
5. **Add `h1` to `styles` or map `h1 → h2`** (G2).
6. **Route unknown/iframe content to `post.bodyHtml`** (or add `rawHtml` to `blockContent.of` and define `rawBlock`) so it validates (G5, G6).
7. **Decide the empty-body policy** for the 437 image-only posts (import as image-only vs. exclude) (F4).
8. **Strip HTML/entities from titles** (F5/3.5.3).
9. **Define image-asset upload + mapping** so inline/featured images get real `asset` references; keep `wpAttachmentId` for traceability (G7).
10. **Fix `test-transform.mjs`** to assert structure against the schema (list item count == source `<li>` count, link preservation, no literal `_`, schema-valid `_type`s) — otherwise the test gives false confidence (3.4).

### 5.3 Import design (when unblocked)
- **Deterministic IDs:** `post-<wpPostId>`; taxonomy already `author-<uid>`, `category-<tid>`, `tag-<tid>`.
- **Idempotency:** `createOrReplace` keyed on the deterministic `_id`; safe to rerun.
- **Draft safety:** write **drafts only** (`drafts.post-<id>`); **never call `publish()`**. All 10 remain unpublished until explicit approval. Verify with GROQ that `count(*[_type=="post" && !(_id in path("drafts.**"))]) == 0`.
- **Validation after import (GROQ):**
  - `count(*[_type=="post"]) == 10`
  - every doc: `wpPostId != null`, `publishedAt == <WP post_date>`, `slug.current` decodes to non-empty Marathi, `defined(body) || defined(featuredImage)`
  - every `body[]` member `_type in ["block","image"]` (after fixes)
  - Devanagari round-trip: `slug.current` and `title` match source after decode
  - `featuredImage.asset->_id` defined for the 8 posts with thumbnails
  - `categories[]`/`tags[]` references all resolve
- **Explicitly out of scope:** full migration, deployment, DNS changes, any modification to `/home/ravi/Projects/freelancing/online24taas/`.

## 6. Summary

**Verified**
- Studio `/` and `/studio` return HTTP 200; **real Chromium check shows clean hydration with zero console/page/network errors** and the Studio UI mounted (48 `data-ui` nodes) behind a login screen.
- Project/dataset config consistent everywhere; write token correctly absent; anonymous client only.
- No credentials or tokens exposed.
- `tsc --noEmit` clean.
- All entity counts claimed in schema comments match the real WordPress dump; all 799 attachment files are present locally.
- Taxonomy (104 docs) already seeded with correct deterministic IDs.
- Marathi Unicode survives the transform and renders.

**Not verified / blocked**
- Authenticated Studio behaviour (no login performed).
- End-to-end app rendering of Portable Text — **no rendering component exists yet**; only library-level rendering was tested.
- Anything that depends on the missing migration plan and normalized data.
- The 10-post test import — **must not run** until the §5.2 prerequisites (F1–F6, G1–G8) are resolved.

**Bottom line:** the CMS foundation (Studio + schemas + taxonomy) is structurally sound and healthy, but the **content pipeline is not ready to migrate**. The highest-priority items are (1) restore the missing plan/normalized data, (2) decode percent-encoded slugs, (3) fix the transform's list/link/mark/`rawHtml` handling so output validates against the schema, and (4) decide the empty-body policy for the 437 image-only posts.

---

### Appendix A — Artifacts produced during this assessment
| Path | Purpose |
|---|---|
| `/tmp/online24taas-work/fixtures/marathi-article.json` | Marathi test fixture (headings, paragraphs, marks, lists, link, image, iframe, unknown block) |
| `/tmp/online24taas-work/fixtures/transform-output.json` | Real transform output for the fixture (9 blocks) |
| `/tmp/online24taas-work/fixtures/validate-transform.mjs` | Schema-vs-transform validator (found G1–G8) |
| `/tmp/online24taas-work/fixtures/render-portabletext.mjs` | `@portabletext/react` render test |
| `/tmp/online24taas-work/fixtures/rendered.html` | Rendered HTML output |
| `/tmp/online24taas-work/migration/intermediate/wp_posts.json` | **Temporary** 6-post extract (78, 10, 273, 675, 2551, 2687) generated only to run `test-transform.mjs` against real data; not a substitute for the missing full normalized dataset |
| `/tmp/studio_browser.json` | Real-browser hydration result for `/studio` |

No source data under `/home/ravi/Projects/freelancing/online24taas/` was modified. No documents were written to the Sanity dataset (only unauthenticated reads). No deployment, DNS, or full-migration actions were performed.

