# Migration runbook

All commands run from the repo root. The original backup (`../online24taas/`) is only ever read.
Working files go to `migration/work/` (git-ignored, regenerable). Nothing in the pipeline deletes data.

## 0. Credentials
- Writes need an Editor/Administrator credential for the target project:
  `export SANITY_API_WRITE_TOKEN=…` (create at manage.sanity.io → API → Tokens) **or** `npx sanity login` and pass `--use-cli-auth`.
- Every script requires `--project` and `--dataset`; there is deliberately no default.

## 1. Parse + normalise (offline)
```
npm run migrate:prepare          # SQL → migration/work/raw → migration/work/normalized, prints reconciliation
npm test                         # must be green: asserts 660/5/20/14/89/1/799/806/1082/437
```

## 2. Upload media (idempotent, resumable)
```
node migration/upload-assets.mjs --project P --dataset D --use-cli-auth --dry-run   # plan: 799 files, 241.7 MiB
node migration/upload-assets.mjs --project P --dataset D --use-cli-auth [--concurrency 6] [--ids 1,2] [--only-used] [--limit N]
```
Uploads the file named by `_wp_attached_file` (not the -150x150 style thumbnails). State: `migration/work/state/P.D/assets.json`.
Sanity de-duplicates by SHA-1, so 799 attachment records resolve to 697 distinct assets.

## 3. Build + validate the bundle (offline)
```
node migration/build-bundle.mjs   --project P --dataset D [--ids 273,2584,…]   # --ids = subset
node migration/validate-bundle.mjs --project P --dataset D [--subset]
```
Output: `migration/work/out/P.D/documents.ndjson` (also importable with `sanity dataset import`), `manifest.json`.

## 4. Import (idempotent, resumable, non-destructive)
```
node migration/import.mjs --project P --dataset D --use-cli-auth --dry-run     # plan + conflict report, zero writes
node migration/import.mjs --project P --dataset D --use-cli-auth [--batch-size 25] [--limit N] [--resume] [--adopt-matching] [--force-update]
```
Per document: missing → create; identical → skip; unchanged since our last write → update; edited by an
editor or unknown → **conflict, skipped and reported**. `--adopt-matching` lets the importer take over
documents seeded earlier that carry the same `wp*` id (needed once for the 104 taxonomy docs in `mkiaioc7`; 31 of the 89 tags also had different names than WordPress, which the import corrects).
`--force-update` overwrites regardless (use deliberately).

## 5. Verify against the live dataset
```
node migration/verify.mjs --project P --dataset D --use-cli-auth
SANITY_TARGET_PROJECT=P SANITY_TARGET_DATASET=D SANITY_USE_CLI_AUTH=1 npm run test:integration
node migration/report.mjs --project P --dataset D       # refresh migration/reports/P.D/
```

## 6. Production run for `mkiaioc7` / `production` (EXECUTED 2026-10-30, verified 2026-10-31)
Authenticated as `write2ravi14@gmail.com` (administrator). Steps as run, usable for a repeat:
0. Identity: `npx sanity debug --secrets` (never paste the token), `npx sanity users list --project-id mkiaioc7`. The user ID shown by
   `whoami` (`gnpi1yQhc`, global Sanity ID) differs from the ID in the project list (`pBcpBIFTg`, project-scoped member ID); the
   project member record carries `sanityUserId: gnpi1yQhc` and the same e-mail, so they are one person. Write access: the project
   permissions list includes `writeAll`, and a `dryRun=true` mutation is accepted.
1. Back up (before any write): `npx sanity dataset export production <dir>/…tar.gz` plus an API export; record SHA-256 and a metadata file.
   Stored in `~/Projects/freelancing/sanity-backups/mkiaioc7-production/`.
2. `node migration/upload-assets.mjs --project mkiaioc7 --dataset production --use-cli-auth` (799 attachments → 697 distinct assets).
3. `node migration/build-bundle.mjs --project mkiaioc7 --dataset production` → `validate-bundle`.
4. Stale drafts `drafts.post-273`, `drafts.post-2551` were exported (`removed-stale-drafts.ndjson`), compared with the published posts, then deleted
   with a revision check. Never delete such drafts without saving them first.
5. `import --dry-run --adopt-matching`, then `import --adopt-matching`: 1,486 created, 103 updated, 1 unchanged, 0 conflicts, 0 failures.
6. `node migration/verify.mjs …`, `node migration/reconcile-live.mjs …`, `npm run test:integration`, `node migration/report.mjs …`.
Published posts are already published; WordPress drafts appear as drafts in Studio.

## Re-running after content edits
Safe at any time: edited documents are reported as conflicts and left untouched.

## Builds
Fonts are self-hosted in `src/fonts` (`next/font/local`), so `next build` needs no access to Google. Do not switch back to `next/font/google`:
a font fetch hang failed a build and the compile step took 7+ minutes.
