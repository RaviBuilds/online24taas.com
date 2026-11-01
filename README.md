# Online24Taas — Next.js + Sanity

Marathi news site migrated from WordPress 6.8 (Adore News theme). Next.js 15 (App Router), Sanity v3
(Studio embedded at `/studio`), Tailwind 4, hosted on Vercel.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` · `npm run lint` | static checks |
| `npm test` | 78 unit tests (parser, normaliser, transform, validator, sanitiser, redirects, slugs, contact form incl. real SMTP socket, cache tags) |
| `npm run test:server` | boots the built app with test secrets and a local SMTP sink: webhook signatures, contact delivery, `ads.txt` (run `npm run build` first) |
| `npm run test:integration` | live-dataset assertions (needs `SANITY_TARGET_PROJECT`, `SANITY_TARGET_DATASET` and a token or `SANITY_USE_CLI_AUTH=1`) |
| `npm run test:e2e` | Playwright against a production build: 28 site tests + a responsive matrix (7 viewports × 12 checks, Chrome and Firefox). Point `E2E_BASE_URL` at a deployment; add `E2E_BYPASS=<secret>` for a protected Vercel preview |
| `npm run studio:login` then `STUDIO_STORAGE_STATE=.auth/studio.json SANITY_USE_CLI_AUTH=1 npm run test:studio` | real Google login in a visible browser (you sign in), then the full Studio workflow on the deployed site: create/draft/publish Marathi post, image upload, alt/caption, category/tag, edit, site check, cleanup. `tools/cleanup-studio-test.mjs` removes leftovers if a run is killed |
| `npm run check` | typecheck + lint + unit + build |

Environment variables: see `.env.example`. Migration runbook: `docs/RUNBOOK.md`. Cut-over: `docs/CUTOVER_CHECKLIST.md`.
Backups and recovery: `docs/BACKUPS_AND_RECOVERY.md`. Credential rotation: `docs/CREDENTIAL_ROTATION.md`. Phase 4 result: `PHASE_4_DEPLOYMENT_READINESS_REPORT.md`.

## Layout

- `src/app/(site)` public site · `src/app/(studio)` Studio · `src/app/api/*` legacy redirects, contact, revalidate
- `src/sanity/schemaTypes` content model · `src/sanity/lib/queries.ts` all public GROQ
- `migration/` WordPress → Sanity pipeline (parse, normalise, transform, bundle, validate, upload, import, verify, report)
- `migration/reports/` committed reconciliation + source→target manifest · `migration/work/` regenerable, git-ignored
- `MIGRATION_*.md` plan, log, status, acceptance report
