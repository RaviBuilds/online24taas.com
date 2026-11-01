# Sanity backups and recovery (`mkiaioc7` / `production`)

Backups live outside the repository in `~/Projects/freelancing/sanity-backups/mkiaioc7-production/`
(not committed: they are large and contain the full dataset). `SHA256SUMS` covers every file there.

## What each file contains

| File | Taken | Documents | Notes |
|---|---|---:|---|
| `…-pre-migration-20261030T134743Z.tar.gz` | before any migration write | **106** | `sanity dataset export`: application documents (89 tags, 14 categories, 1 author, 2 posts = the two drafts `drafts.post-273`, `drafts.post-2551`) plus the **14 image files** in `images/`. The CLI export never includes Sanity-managed documents, so no `sanity.imageAsset` documents and no `system.*` documents. |
| `…-pre-migration-20261030T134743Z-api-export.ndjson` | same moment | **132** | Raw documents from the HTTP export API: the same 106 + 14 `sanity.imageAsset` documents + 11 `system.group` + 1 `system.retention`. No binary files. |
| `removed-stale-drafts.ndjson` | before deleting two drafts | 2 | The only documents deleted during the migration (identical data to the published posts, see `MIGRATION_EXECUTION_LOG.md`). |
| `…-post-migration-20261031T174114Z.tar.gz` (218 MB) | after migration, before Phase 4 editorial tests | **1,590** + 695 image files + 5 other files | Full freeze of the migrated site. `FREEZE_METADATA.json` describes it. |

**The 106 vs 132 difference (26 documents)** is exactly 14 `sanity.imageAsset` + 11 `system.group` + 1 `system.retention`:
the tarball is an application-level export, the API export is a raw dump of everything the dataset stores.
Nothing else differs; all 106 tarball documents are identical to their API-export counterparts, except that
`drafts.post-273.featuredImage` is written as a file path (`image@file://./images/…`) inside the tarball and as an asset reference in the API export.

The Sanity-managed documents are not application data: `system.group`/`system.retention` are created by the platform for every
project, and `sanity.imageAsset` documents are re-created when the image files are uploaded again (the asset ID is derived from the file's SHA-1, so
the same file always returns the same asset ID).

## Recovery test (done 2026-10-31, scratch dataset `restore-test`, deleted afterwards)

1. Created dataset `restore-test`, ran `npx sanity dataset import <pre-migration tarball> restore-test`.
2. Compared every non-system document with the API export (ignoring `_rev`, timestamps and generated `_key`s):
   **120 of 120 identical** (106 application documents + 14 image assets), 0 missing, 0 different.
3. Also replayed the API export with `tools/restore-api-export.mjs` on top: same result.

Conclusion: the complete pre-existing application content is recoverable from the tarball alone. The 12 system documents are platform-managed and need no restore.

> Do not verify a backup with `sanity dataset export --no-assets`: that flag also removes image fields from documents (found while testing).

## Restore procedure

```bash
# 1. never restore over production directly; use a scratch dataset
npx sanity dataset create restore-test --visibility private
# 2. documents + images
npx sanity dataset import <backup.tar.gz> restore-test
# 3. compare / inspect (Studio: set NEXT_PUBLIC_SANITY_DATASET=restore-test) or query with the client
# 4. when satisfied, either point the site at the restored dataset, or copy over:
npx sanity dataset copy restore-test production          # replaces production content; take a fresh backup first
# 5. clean up
npx sanity dataset delete restore-test
```

For documents only (no images): `node tools/restore-api-export.mjs <export.ndjson> --project mkiaioc7 --dataset <name> --use-cli-auth`
(refuses to write to a dataset called `production` without `--confirm-production`).

## Taking a new backup

```bash
cd online24taas-web
npx sanity dataset export production ~/Projects/freelancing/sanity-backups/mkiaioc7-production/mkiaioc7-production-$(date -u +%Y%m%dT%H%M%SZ).tar.gz
cd ~/Projects/freelancing/sanity-backups/mkiaioc7-production && sha256sum <file> >> SHA256SUMS
node migration/inventory-live.mjs --project mkiaioc7 --dataset production --use-cli-auth      # live counts by type
```

Sanity also keeps its own history and retention for the dataset (see manage.sanity.io → Project → Datasets), but that is not a substitute for an off-platform backup.

## Counts to expect (verified against the live dataset 2026-10-31)

2,302 documents in total = **1,590 application documents** + 712 Sanity-managed (695 image assets, 5 file assets, 11 `system.group`, 1 `system.retention`).
Application documents: author 1, category 14, tag 89, mediaAsset 799, post 679 (660 published + 19 drafts), page 5, menu 2, siteSettings 1.
The "listed" 1,587 omitted `menu` (2) and `siteSettings` (1). Asset documents: 700 = 697 migrated + 3 seed-only (unreferenced) assets.
