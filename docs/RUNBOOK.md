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
documents seeded earlier that carry the same `wp*` id (needed once for the 104 taxonomy docs in `mkiaioc7`).
`--force-update` overwrites regardless (use deliberately).

## 5. Verify against the live dataset
```
node migration/verify.mjs --project P --dataset D --use-cli-auth
SANITY_TARGET_PROJECT=P SANITY_TARGET_DATASET=D SANITY_USE_CLI_AUTH=1 npm run test:integration
node migration/report.mjs --project P --dataset D       # refresh migration/reports/P.D/
```

## 6. Production run for `mkiaioc7` / `production` (blocked until credentials exist)
1. Back up: `npx sanity dataset export production backups/mkiaioc7-$(date +%F).tar.gz` (a public-view export from 2026-10-30 is already in `migration/work/backups/`).
2. `node migration/upload-assets.mjs --project mkiaioc7 --dataset production --token …`
3. `node migration/build-bundle.mjs --project mkiaioc7 --dataset production` → `validate-bundle`
4. The failed Phase 2 left two stale drafts in `mkiaioc7` (`drafts.post-273`, `drafts.post-2551`). Discard them in Studio
   (document menu → "Discard changes") before importing: the importer creates the *published* `post-273`/`post-2551`, and a leftover draft
   would show as pending edits on top of it. They are never touched by the importer (its bundle only writes `post-273`, not `drafts.post-273`).
   Then `import --dry-run --adopt-matching`: expect 0 conflicts (the 104 seeded taxonomy docs are adopted by `wp*` id and get corrected slugs: 77 of 103 had percent-encoded slugs).
5. `import --adopt-matching`, then `verify` + `test:integration` + `report`.
6. Publish: Studio shows imported WordPress *drafts* as drafts; published posts are already published (they are not drafts).

## Re-running after content edits
Safe at any time: edited documents are reported as conflicts and left untouched.
