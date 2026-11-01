# Execution log

Times are 2026-10-30 (IST) unless stated. Sensitive values are never logged.

## Audit
- Roots confirmed: WordPress backup `/home/ravi/Projects/freelancing/online24taas`, app `/home/ravi/Projects/freelancing/online24taas-web`. `/tmp/online24taas-work` still existed but was stale (old 1610-row parser output); regenerated from SQL.
- `online24taas-web` was **not a git repository**: initialised, baseline commit `41cad3c` of inherited state, `.gitignore` hardened (env, SQL, archives, migration work dirs).
- `package.json` lacked `next`, Tailwind, ESLint, Playwright: added.
- Sanity access: CLI token valid for project `qvtcbb1j` only (admin); `mkiaioc7` returns `projectUserNotFoundError`. `mkiaioc7/production` readable anonymously.

## Parser / normaliser
- `migration/parse_wp_sql.py` (new): column names from `CREATE TABLE`, single string-aware state machine, aborts on column-count mismatch, strips password hashes, allow-lists `wp_options`. wp_posts = 2308 rows in 60 statements (matches independent regex cross-check in tests).
- `migration/normalize.mjs`: classifies every ID exactly once (2308 = 660 + 5 + 20 + 799 + 806 + 12 nav + 6 system).
- Bugs fixed vs the previous engine: titles with HTML; mid-word truncated slugs; slug collisions; percent-decoding of truncated escapes; draft slugs taking a published slug; fake-green shell tests replaced by `node:test` suites asserting real data.

## Transform
- `migration/lib/portable-text.mjs` rewritten on a real DOM (parse5): real marks (no `**`), links as annotations, nested lists with levels, images by `wp-image-N` or upload path, galleries, centred paragraphs, colour marks, `rawHtml` fallback. Text of all 240 non-empty documents is proven identical to source (whitespace-insensitive).
- Found by tests and fixed: colour class regex captured `has-inline-color` instead of the palette colour; sanitiser left empty `<iframe>` shells.

## Pipeline + test import (target `qvtcbb1j` / `migration-test`, new private dataset)
- Dataset created (free plan limit of 2 datasets now reached).
- 12 documents requested for the controlled test: posts 273 (image-led), 2551, 2584, 78, 89, 92, 472, 675 (raw HTML iframes), 929 (centred, many images), 580 (captions with colours), page 342 (HTML block), draft 83. Prior test IDs 10, 35, 219 were dropped (no distinguishing features); the other prior IDs were kept.
- 30 assets uploaded, 146 documents imported; second run = 146 unchanged (idempotent). Tamper test: patched `post-78` title → `verify` failed; re-import reported a conflict and did not overwrite; `--force-update` restored it.

## Full rehearsal (same dataset; the subset docs were adopted from import history)
- 799 attachments → 769 uploads in 3m32s (30 already present) → 697 distinct Sanity assets (identical binaries are shared).
- Bundle 1,590 docs (1 author, 14 categories, 89 tags, 799 media, 660 posts + 19 drafts, 5 pages, 2 menus, siteSettings), 0 validation errors; dry-run → 1,444 create / 1 update (post 929 after the colour fix); import in 1m46s, 0 failures; rerun 1,590 unchanged.
- `verify`: 1,590/1,590 present, 697/697 assets resolve, 0 dangling refs, 684/684 bodies equal source text, 437 image-led checked, 0 duplicates, 0 Unicode issues.

## Frontend / QA
- Built site, Studio structure, SEO routes, legacy handler, contact form. First `?p=ID` implementation passed values in the query string of the rewrite; a rewritten route handler still sees the original query → all legacy URLs 404'd. Re-implemented with path parameters; verified by curl and Playwright.
- E2E found: `/blog/page/99999` served page 1 (fixed: strict page parsing), unmatched multi-segment URLs rendered the default 404 (catch-all route added), missing favicon request (favicon from Site settings), lazy images never "complete" in the test helper.
- Studio: opened with an injected Admin token; created a Marathi post with Devanagari slug and bold text, draft stayed private, publish worked, editing a published doc created a separate draft; test documents deleted afterwards (679 posts remain = 660 + 19). One earlier aborted run left a draft that was removed by title+no-`wpPostId` match.
- Added CORS origin `http://localhost:3100` and a Viewer token (`online24taas-migration-test-read`) to `qvtcbb1j`.

## Production migration `mkiaioc7` / `production` (executed 2026-10-30 ~19:17-19:35 IST; recorded and re-verified 2026-10-31)
This was done in an earlier session and not logged at the time. Evidence is in `migration/work/logs/`, `migration/work/state/mkiaioc7.production/`,
the backup folder and `migration/reports/mkiaioc7.production/`. Re-verified against the live dataset on 2026-10-31 rather than trusted.
- **Identity**: `sanity debug`: Google login `write2ravi14@gmail.com`, role administrator, project `mkiaioc7` "online24taas". `whoami` ID `gnpi1yQhc` is the
  global user ID; the project list shows the project member ID `pBcpBIFTg`, whose record has `sanityUserId: gnpi1yQhc` and the same e-mail: same person, different ID types.
  Membership checked by e-mail via the project member API. Project permissions include `writeAll`; a `dryRun` create mutation was accepted (nothing written).
  Only dataset: `production`. `.env.local` points to `mkiaioc7/production`; `qvtcbb1j` appears only in `.env.rehearsal.local` and in the rehearsal reports.
- **Backup** (before any write): `~/Projects/freelancing/sanity-backups/mkiaioc7-production/`: `…-20261030T134743Z.tar.gz` (106 documents: 89 tags, 14 categories, 2 posts, 1 author; 14 image files)
  and `…-api-export.ndjson` (132 documents incl. system docs); `BACKUP_METADATA.json` records time, project, dataset, account e-mail; `SHA256SUMS` re-checked OK.
- **Seeded data**: of 104 taxonomy docs, 70 had percent-encoded slugs; 31 tags had names different from the WordPress term with the same ID. Importer adopted them by `wp*` ID and corrected them (WordPress is the source of truth).
- **Stale drafts**: `drafts.post-273` (empty body, same title/slug/author/category/tags/featured image as the migrated post) and `drafts.post-2551` (body = single word "placeholder", title "placeholder", slug "test") were saved to `removed-stale-drafts.ndjson`, then deleted with a revision check. Published `post-273` and `post-2551` carry the full WordPress content. 0 drafts shadow a published document.
- **Assets**: 799 uploads, 0 failed, 697 distinct Sanity assets; WordPress attachment ID to asset mapping in `migration/work/state/mkiaioc7.production/assets.json` and per-document in the manifest.
- **Import**: 1,590 documents; created 1,486, updated 103, unchanged 1, conflicts 0, failed 0, retries 0; dry-run re-run: 1,590 unchanged.
- **Verification (2026-10-31)**: `verify` OK (1,590/1,590, 697/697 assets, 0 dangling, 684/684 bodies, 437 image-led, 0 duplicates, 0 Unicode issues); `reconcile-live` OK (0 mismatches: counts, slugs, dates, authors, categories, tags, featured images, SEO); `test:integration` 10/10.
- **Frontend**: `npm run check` (typecheck, lint, 67 unit tests, build) passes. Playwright against a `next start` of the production build: 28 passed, 1 skipped (opt-in Studio test).
- **Issues found and fixed on 2026-10-31**
  - Lint reported 36k problems from a stale `.next-e2e/` build output: added `.next-*/**` to the ESLint ignores.
  - Build took 7+ min and once failed (`socket hang up`) fetching Google Fonts: fonts are now self-hosted (`src/fonts`, `next/font/local`; Noto Sans Devanagari variable + Roboto 400/500/700, OFL/Apache licences included). Build: 79-114 s compile.
  - E2E "category archive paginates" failed under 3 parallel workers (reproduced 3 times; passes alone). Cause: a click on a page link while Next's prefetch of the same URL was in flight was dropped (confirmed: blocking prefetch requests made the click work first time). Fix: `prefetch={false}` on pagination links. Full suite then passed.
- **Not possible here**: Vercel (no CLI/login), SMTP (no credentials), Studio image upload through the UI.

## Phase 4 (2026-10-31 / 2026-11-01): production readiness, Vercel preview
Details and evidence: `PHASE_4_DEPLOYMENT_READINESS_REPORT.md`. Chronological summary:
- **Dataset frozen and reconciled**: live `mkiaioc7/production` = 2,302 documents = 1,590 application + 712 Sanity-managed. The "missing" 3 of 1,590 are 2 `menu` + 1 `siteSettings`. Backup analysis (106 vs 132) and a scratch-dataset restore test (120/120 identical) in `docs/BACKUPS_AND_RECOVERY.md`. Full post-migration export (218 MB, SHA-256 recorded) taken before any editorial test.
- **Design**: components rebuilt from the Adore News templates/CSS and the WordPress options (banner = posts 89/105/178, latest-posts blog index with right sidebar, four-column footer).
- **Contact form**: validation, honeypot, render-time trap, origin check, rate limit, size limits, 503 when SMTP is not configured; 10 new unit tests + real-socket SMTP sink tests. **No real email was sent or tested** (SMTP setup deferred to the owner).
- **Vercel**: CLI via `npx vercel@latest`; owner approved the device login. No existing project, so `online24taas-web` was created. The first deployment landed in the production environment by default; it was removed and replaced by a preview. Preview `https://online24taas-preview.vercel.app`, Deployment Protection kept on, automation bypass used only by tests and the webhook.
- **Sanity**: CORS origin for the preview (credentials), document webhook `online24taas-preview-revalidate`; create/edit/delete of a temporary post revalidated the preview in 1–4 s (3 deliveries, all HTTP 200); the temporary post was deleted.
- **Defect found by testing the real deployment**: every Marathi article returned HTTP 500 on Vercel because per-article cache tags (`post:<Marathi slug>`) travel in the ASCII-only `x-next-cache-tags` header. Local `next start` does not send that header, so earlier local runs could not see it. Fixed with hashed ASCII tags (`src/lib/cache-tags.ts`, used by pages and webhook).
- **Defects found by the new test matrix**: widget headings had line-height 1.25 (below the 1.3 minimum used for Devanagari); Firefox performed full-page reloads because aborted viewport prefetches made the router fall back to browser navigation (prefetch is now off site-wide via `AppLink`).
- **Security**: secret scan of all commits and of the client bundle (local and deployed) found nothing; MCP robot token "MCP agent read/write" revoked after checking it was unused; WordPress credential rotation prepared (`docs/CREDENTIAL_ROTATION.md`) but not executed (needs hosting access).
- **Studio**: UI workflow spec `e2e/studio-ui.spec.ts` and `npm run studio:login` helper; see the report for what was and was not proven.
- **Test hygiene**: a test run killed mid-way once left a draft/test documents in production; they were identified by title and the absence of WordPress IDs, deleted, and the dataset re-verified at 679 posts / 14 categories / 89 tags / 695 image assets. `tools/cleanup-studio-test.mjs` was added for such cases.

