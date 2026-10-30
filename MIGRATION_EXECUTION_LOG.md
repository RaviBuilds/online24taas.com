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

## Not done (blocked)
Production write to `mkiaioc7`, production dataset export (a public-view export was saved), Vercel preview, DNS.
