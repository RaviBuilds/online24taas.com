# Acceptance report — against the "Definition of done"

Overall: **code, pipeline and the full migration are complete and verified on an isolated dataset
(`qvtcbb1j/migration-test`). The migration into the intended production project `mkiaioc7`, the Vercel
preview and the public cut-over are NOT done** — see the blocker in `docs/CUTOVER_CHECKLIST.md` §A.

## Content
| Criterion | Result |
|---|---|
| 660 posts migrated | ✅ rehearsal dataset (660 published) — ❌ not yet in `mkiaioc7` |
| 5 pages | ✅ rehearsal |
| Recoverable drafts as drafts; 20 records classified | ✅ 19 Sanity drafts, 1 archived auto-draft; `migration/reports/*/drafts-classification.json` |
| 14 categories, 89 tags, author | ✅ rehearsal. Author login/e-mail deliberately not migrated (PII) |
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
| Taxonomy, image upload, SEO fields | ✅ taxonomy relationships verified; SEO object present. Image *upload via Studio UI* was not exercised (assets were uploaded via API) |
| Production dataset matches manifest | ❌ **blocked** (rehearsal dataset matches: `VERIFY OK`) |

## Website
Homepage, article, pages, categories, tags, search (Marathi), pagination, images, Marathi typography
(Noto Sans Devanagari, line-height ≥ 1.3 asserted), historical redirects, metadata/canonical/OG/JSON-LD, mobile and
desktop layouts, no console errors: ✅ 28 Playwright tests, run against a production build.
Not covered: visual regression vs. the old site (design follows the Adore News structure and `#c80815` brand colour but is not pixel-matched); real-device testing; Lighthouse.

## Engineering
Reconciliation, import repeatability/resumability, transform tests, TypeScript, build, browser tests: ✅.
No credentials in git (scan done) or in the client bundle (read token searched for in `.next`): ✅.
ESLint: 0 errors, 7 warnings.

## Deployment
`vercel.json`, `.env.example`, cut-over + rollback checklist: ✅. Preview deployment: ❌ blocked (no Vercel access).
Original WordPress backup: untouched (SQL hash recorded in the master plan).

## Open items for the owner
1. Grant write access to `mkiaioc7` (or choose `qvtcbb1j`) → run runbook §6.
2. Vercel project, env vars, CORS, webhook, SMTP.
3. Approve DNS cut-over; rotate exposed WordPress credentials afterwards.
4. Decide whether the AdSense script should stay (kept, production-only).
5. Extra side effects in `qvtcbb1j`: dataset `migration-test` (≈1.6k docs, 697 assets), a Viewer token, a localhost CORS origin. Remove if unwanted.
