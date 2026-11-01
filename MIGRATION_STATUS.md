# Migration status — 2026-11-01 (after Phase 4)

Legend: NOT STARTED · IN PROGRESS · BLOCKED · COMPLETED · VERIFIED

| Area | Status | Evidence |
|---|---|---|
| Audit, git, durable dirs, docs | VERIFIED | git history, this file |
| Parser / normaliser | VERIFIED | `npm test` (parser + reconciliation suites) |
| Portable Text transform | VERIFIED | 240/240 documents text-identical to source |
| Import pipeline (upload/bundle/validate/import/verify/report) | VERIFIED | idempotent re-run, tamper + conflict test |
| 10-post test import | VERIFIED | `qvtcbb1j/migration-test`, 146 docs |
| Full migration rehearsal | VERIFIED | `qvtcbb1j/migration-test`, 1,590 docs, `VERIFY OK` |
| Access to `mkiaioc7` | VERIFIED | `write2ravi14@gmail.com` (Google), administrator, `writeAll` permission, server-side dry-run mutation accepted; see execution log |
| Pre-migration backup of `mkiaioc7/production` | VERIFIED | `~/Projects/freelancing/sanity-backups/mkiaioc7-production/` (tarball + API export, SHA-256 checked) |
| Full migration to **`mkiaioc7/production`** | **VERIFIED** | `verify` OK, `reconcile-live` OK (0 mismatches), integration 10/10, all re-run 2026-10-31 |
| Frontend (all templates) | VERIFIED | 28 Playwright tests pass (1 opt-in Studio test skipped) on a production build reading `mkiaioc7/production` |
| Build without network font fetch | COMPLETED | fonts self-hosted in `src/fonts` (`next/font/local`); build 3 min instead of 7+ and no Google dependency |
| SEO, redirects, sitemap, RSS | VERIFIED | e2e + unit |
| Studio editor workflow | VERIFIED | opt-in authenticated Playwright test passed; `sanity schema validate`: 0 errors/warnings |
| Vercel preview deployment | VERIFIED | `https://online24taas-preview.vercel.app` (project `online24taas-web`, protected preview); see `PHASE_4_DEPLOYMENT_READINESS_REPORT.md` |
| CORS + revalidation webhook for the preview | VERIFIED | create/edit/delete revalidated in 1–4 s, 3 deliveries HTTP 200 |
| Studio editor workflow on the deployed site | VERIFIED (token session) / PENDING (Google login) | `e2e/studio-ui.spec.ts` passed in the real Studio UI incl. image upload via the UI; the interactive Google sign-in itself must be done by the owner (`npm run studio:login`) |
| Design vs. Adore News original | COMPLETED | structure, colours, type scale, banner, grid, sidebar, footer rebuilt from the theme CSS/templates; not pixel-compared (the original site is no longer reachable; only a CSS-less web.archive.org capture exists) |
| Contact form | COMPLETED (code) / OWNER (SMTP) | validation, spam traps, rate limit, 503 until `SMTP_URL`+`CONTACT_TO` are set; delivery to a real mailbox not tested by request |
| AdSense | COMPLETED (code) / OWNER (`ads.txt`) | script on production deployments only; `/ads.txt` serves `ADS_TXT` or 404 |
| DNS / go-live | NOT STARTED | requires explicit approval |

## Counters (live `mkiaioc7/production` vs source)
| Item | Source | Normalised | Sanity | Notes |
|---|---:|---:|---:|---|
| Published posts | 660 | 660 | 660 | 437 literal-empty + 4 placeholder-only → 441 without body |
| Pages | 5 | 5 | 5 | |
| Drafts (19) / auto-draft (1) | 20 | 20 | 19 drafts | auto-draft 2723 archived only |
| Categories / tags / authors | 14 / 89 / 1 | same | same | |
| Attachments | 799 | 799 | 799 media docs, 697 distinct assets | 102 attachments share identical binaries |
| Revisions | 806 | 806 | 0 | excluded by policy, listed in manifest |
| Comments | 1,082 | archived | 0 | all unapproved |
| Failed imports / retries | | | 0 / 0 | |
| Unresolved records | | | 0 | |

## Tests
| Suite | Result |
|---|---|
| Unit (`npm test`) | 78 pass / 0 fail |
| Server (`npm run test:server`) | 7 pass / 0 fail (webhook signatures, SMTP sink, `ads.txt`) |
| Integration (live `mkiaioc7/production`) | 10 pass / 0 fail |
| Playwright e2e (site) | 28 pass / 0 fail |
| Playwright responsive matrix | Chrome 53 pass; Firefox 24 pass (7 viewports 320–1920 px, 12 checks) |
| Studio workflow (opt-in, deployed preview) | 1 pass (8.3 min), leaves no content behind |
| `tsc --noEmit` | pass |
| ESLint | 0 errors (generated `.next-*` dirs now ignored), warnings only in migration scripts |
| `next build` | pass |

## Production-only facts
- Pre-existing documents (104 taxonomy: 1 author, 14 categories, 89 tags; plus drafts `post-273`, `post-2551`) were backed up first. 70 of the 104 had percent-encoded slugs; **31 of the 89 tags also carried a different name than WordPress for the same ID** (the earlier seed was shifted). The WordPress source is authoritative, so those were overwritten by ID. Originals are in the backup.
- The two drafts were removed from live after their content was saved to `removed-stale-drafts.ndjson`. Their data is a subset of the published `post-273` / `post-2551` (same title, slug, author, category, tags, featured image); `drafts.post-2551` was a one-word "placeholder" body.
- Live dataset also contains Sanity system documents and 14 image assets from the earlier seed; they are untouched.

## Remaining (owner or external)
| Item | State |
|---|---|
| Google login proof | run `npm run studio:login` once, then `npm run test:studio` with `STUDIO_STORAGE_STATE` |
| SMTP | set `SMTP_URL`, `CONTACT_TO`, `CONTACT_FROM` in Vercel (`.env.example`); not tested by request |
| AdSense `ads.txt` | copy the lines from the AdSense console into Vercel `ADS_TXT` |
| Production domain, CORS origin and webhook for it | after the domain is added in Vercel (`docs/CUTOVER_CHECKLIST.md` §B) |
| WordPress credential rotation | `docs/CREDENTIAL_ROTATION.md` (needs hosting access) |
| Old Sanity project `qvtcbb1j` | revoke Viewer token, delete `migration-test` dataset (other account) |
| DNS / go-live | NOT STARTED, needs approval |
