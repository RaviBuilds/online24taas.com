# Online24Taas — Next.js + Sanity

Marathi news site migrated from WordPress 6.8 (Adore News theme). Next.js 15 (App Router), Sanity v3
(Studio embedded at `/studio`), Tailwind 4, hosted on Vercel.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` · `npm run lint` | static checks |
| `npm test` | 67 unit tests (parser, normaliser, transform, validator, sanitiser, redirects, slugs) |
| `npm run test:integration` | live-dataset assertions (needs `SANITY_TARGET_PROJECT`, `SANITY_TARGET_DATASET` and a token or `SANITY_USE_CLI_AUTH=1`) |
| `npm run test:e2e` | Playwright against a production build (28 tests, desktop + mobile) |
| `STUDIO_TOKEN=… npx playwright test studio` | authenticated Studio editing workflow (opt-in) |
| `npm run check` | typecheck + lint + unit + build |

Environment variables: see `.env.example`. Migration runbook: `docs/RUNBOOK.md`. Cut-over: `docs/CUTOVER_CHECKLIST.md`.

## Layout

- `src/app/(site)` public site · `src/app/(studio)` Studio · `src/app/api/*` legacy redirects, contact, revalidate
- `src/sanity/schemaTypes` content model · `src/sanity/lib/queries.ts` all public GROQ
- `migration/` WordPress → Sanity pipeline (parse, normalise, transform, bundle, validate, upload, import, verify, report)
- `migration/reports/` committed reconciliation + source→target manifest · `migration/work/` regenerable, git-ignored
- `MIGRATION_*.md` plan, log, status, acceptance report
