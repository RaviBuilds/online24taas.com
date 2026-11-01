# Acceptance report — against the "Definition of done"

Overall: **the migration into the intended production project `mkiaioc7` / `production` is done and verified against the live
dataset (2026-10-31), and re-verified in Phase 4 (2026-11-01).** A protected Vercel preview with CORS and a working revalidation webhook exists. SMTP, the production domain webhook/CORS and the public DNS cut-over are NOT done; see "Open items" and `PHASE_4_DEPLOYMENT_READINESS_REPORT.md` (status: CONDITIONALLY READY).

## Content
| Criterion | Result |
|---|---|
| 660 posts migrated | ✅ 660 published in `mkiaioc7/production` (live count) |
| 5 pages | ✅ 5 live |
| Recoverable drafts as drafts; 20 records classified | ✅ 19 live drafts, 1 archived auto-draft (2723, not in Sanity); `migration/reports/*/drafts-classification.json` |
| 14 categories, 89 tags, author | ✅ live: 14 / 89 / 1, slugs normalised, 0 percent-encoded slugs left. Author login/e-mail deliberately not migrated (PII) |
| 799 attachment records accounted for; binaries uploaded + mapped | ✅ 799 media docs, 697 distinct assets, all resolve; source WordPress id on each asset |
| 437 image-led posts preserved | ✅ (plus 4 placeholder-only posts: 441 with no body, all with featured image) |
| Marathi intact | ✅ 684/684 bodies equal source text; 0 Unicode issues |
| No unexplained missing IDs / duplicates / broken image refs | ✅ `source-to-target-manifest.json`: 1,590 target documents + 807 listed exclusions (806 revisions + auto-draft 2723); the 12 nav-menu items become 2 `menu` docs and the 6 WordPress system posts (CF7 form, global styles, Elementor kit, custom CSS, 2 WPCode drafts) are classified `other-system` in `reconciliation.json`; 0 duplicates; 0 unresolved images |

Known formatting losses (documented, content kept): inline colour/format marks inside image **captions** (127 colour marks counted; caption text kept as plain text), `text-align` other than centre (none occur), inline `style` attributes (none dropped by count), linked images lose their link (0 occurrences).

## Sanity CMS
| Criterion | Result |
|---|---|
| Studio loads and works | ✅ HTTP 200, authenticated session, `schema validate` clean |
| Editor creates / publishes / edits Marathi content | ✅ automated UI test (draft private → publish → edit makes draft) |
| Taxonomy, image upload, SEO fields | ✅ taxonomy relationships verified; SEO object present. Phase 4: image upload through the Studio UI (featured image and inline image, with alt text and caption) passed on the deployed preview |
| Production dataset matches manifest | ✅ `verify`: 1,590/1,590 manifest entries present, 697/697 assets resolve, 0 dangling refs, 684/684 body texts equal source, 0 duplicates, 0 Unicode issues. `reconcile-live`: 0 mismatches. Integration tests 10/10 |

## Website
Homepage, article, pages, categories, tags, search (Marathi), pagination, images, Marathi typography
(Noto Sans Devanagari, line-height ≥ 1.3 asserted), historical redirects, metadata/canonical/OG/JSON-LD, mobile and
desktop layouts, no console errors: ✅ 28 Playwright tests (1 opt-in Studio test skipped), run against a production build reading `mkiaioc7/production`. Fixed during this run: pagination links are no longer prefetched, because a click made while the same URL's prefetch was in flight could be dropped; fonts are self-hosted.
Phase 4 rebuilt the templates from the Adore News theme source (header, banner, 3-column grid, sidebar, footer); there is no pixel comparison because the old site is unreachable. Not covered: real-device testing (WebKit/Safari cannot run on this machine). Lighthouse numbers are in the Phase 4 report.

## Engineering
Reconciliation, import repeatability/resumability, transform tests, TypeScript, build, browser tests: ✅.
No credentials in git (scan done) or in the client bundle (read token searched for in `.next`): ✅.
ESLint: 0 errors (warnings in migration scripts only).

## Deployment
`vercel.json`, `.env.example`, cut-over + rollback checklist: ✅. Preview deployment: ✅ `https://online24taas-preview.vercel.app`.
Original WordPress backup: untouched (SQL hash recorded in the master plan).

## Production dataset: what was and was not written
- Backup first: `~/Projects/freelancing/sanity-backups/mkiaioc7-production/` (tarball with 106 documents + 14 image files, API export with 132 documents, SHA-256 verified, metadata with project/dataset/date).
- Written: 1,590 documents (1 author, 14 categories, 89 tags, 799 mediaAsset, 660 posts, 19 draft posts, 5 pages, 2 menus, 1 siteSettings) and 697 image assets. 1,486 created, 103 updated (seeded taxonomy and `post-273`/`post-2551` corrected by ID), 1 unchanged, 0 conflicts, 0 failures.
- Seeded data corrected, not dropped: 70 of 104 taxonomy docs had percent-encoded slugs; 31 tags carried a different name from the WordPress term with the same ID. Originals are in the backup.
- Removed: only `drafts.post-273` and `drafts.post-2551` (stale test drafts of the same posts; saved in `removed-stale-drafts.ndjson` before deletion; the published documents contain the full content).
- Failed / unresolved source records: none. Excluded by policy: 806 revisions, 1,082 unapproved comments (archived), auto-draft 2723; listed in `migration/reports/mkiaioc7.production/`.

## Open items for the owner
See `docs/CUTOVER_CHECKLIST.md` §B for the exact steps. In short: Google-login proof run (`npm run studio:login`), SMTP variables, AdSense `ads.txt`, production domain + its CORS origin + webhook, WordPress credential rotation (`docs/CREDENTIAL_ROTATION.md`), revoke the old test token in project `qvtcbb1j`, approve DNS cut-over.
