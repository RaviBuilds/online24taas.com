# Migration status — 2026-10-30

Legend: NOT STARTED · IN PROGRESS · BLOCKED · COMPLETED · VERIFIED

| Area | Status | Evidence |
|---|---|---|
| Audit, git, durable dirs, docs | VERIFIED | git history, this file |
| Parser / normaliser | VERIFIED | `npm test` (parser + reconciliation suites) |
| Portable Text transform | VERIFIED | 240/240 documents text-identical to source |
| Import pipeline (upload/bundle/validate/import/verify/report) | VERIFIED | idempotent re-run, tamper + conflict test |
| 10-post test import | VERIFIED | `qvtcbb1j/migration-test`, 146 docs |
| Full migration rehearsal | VERIFIED | `qvtcbb1j/migration-test`, 1,590 docs, `VERIFY OK` |
| Full migration to **`mkiaioc7/production`** | **BLOCKED** | CLI user is not a member of `mkiaioc7` (see `docs/CUTOVER_CHECKLIST.md` §A) |
| Frontend (all templates) | VERIFIED | 28 Playwright tests on a production build |
| SEO, redirects, sitemap, RSS | VERIFIED | e2e + unit |
| Studio editor workflow | VERIFIED | opt-in authenticated Playwright test passed; `sanity schema validate`: 0 errors/warnings |
| Vercel preview deployment | BLOCKED | no Vercel CLI/credentials in this environment; `vercel.json` ready |
| DNS / go-live | NOT STARTED | requires explicit approval |

## Counters (rehearsal dataset vs source)
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
| Integration (live dataset) | 10 pass / 0 fail |
| Playwright e2e (desktop + mobile) | 28 pass / 0 fail |
| Studio workflow (opt-in) | 1 pass |
| `tsc --noEmit` | pass |
| ESLint | 0 errors, 7 warnings (unused variables in migration scripts) |
| `next build` | pass |

## Deployment readiness
Code: ready. Needs: Sanity access to `mkiaioc7`, Vercel project + env vars, SMTP for the contact form, CORS entries, webhook, approval for DNS.
