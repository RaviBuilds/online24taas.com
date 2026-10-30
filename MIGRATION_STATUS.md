# Migration status — 2026-10-31

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
| Vercel preview deployment | BLOCKED | no Vercel CLI/credentials in this environment; `vercel.json` ready |
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
| Unit (`npm test`) | 67 pass / 0 fail |
| Integration (live `mkiaioc7/production`) | 10 pass / 0 fail |
| Playwright e2e (desktop + mobile) | 28 pass / 0 fail / 1 skipped (opt-in Studio test), against `mkiaioc7/production` |
| Studio workflow (opt-in) | 1 pass |
| `tsc --noEmit` | pass |
| ESLint | 0 errors (generated `.next-*` dirs now ignored), warnings only in migration scripts |
| `next build` | pass |

## Production-only facts
- Pre-existing documents (104 taxonomy: 1 author, 14 categories, 89 tags; plus drafts `post-273`, `post-2551`) were backed up first. 70 of the 104 had percent-encoded slugs; **31 of the 89 tags also carried a different name than WordPress for the same ID** (the earlier seed was shifted). The WordPress source is authoritative, so those were overwritten by ID. Originals are in the backup.
- The two drafts were removed from live after their content was saved to `removed-stale-drafts.ndjson`. Their data is a subset of the published `post-273` / `post-2551` (same title, slug, author, category, tags, featured image); `drafts.post-2551` was a one-word "placeholder" body.
- Live dataset also contains Sanity system documents and 14 image assets from the earlier seed; they are untouched.

## Blocked / remaining (owner or external)
| Item | State |
|---|---|
| Vercel preview | BLOCKED: no Vercel CLI or login in this environment. `vercel.json` ready |
| CORS / webhook / read token for the deployed origin | NOT DONE: needs the Vercel URL. Current CORS: `localhost:3333`, `localhost:3000` only |
| Contact form | `/api/contact` answers 503 until `SMTP_URL`, `CONTACT_TO`, `CONTACT_FROM` are set |
| AdSense | script is wired, production-only (`ca-pub-5681729675386373`); **no `ads.txt` exists in the old backup or the new site**: add the line from the AdSense console |
| Studio image upload through the UI | NOT EXERCISED (requires an interactive Studio login with a real session) |
| DNS / go-live | NOT STARTED, needs approval |
| Credential rotation | NOT DONE: see `docs/CUTOVER_CHECKLIST.md` §E |
