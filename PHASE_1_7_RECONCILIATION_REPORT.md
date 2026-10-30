# PHASE 1.7 — Source Count Reconciliation and Final Import Gate

**Project:** `/home/ravi/Projects/freelancing/online24taas-web`
**Original backup (read-only, untouched):** `/home/ravi/Projects/freelancing/online24taas/APP-DATA.SQL`
**Verdict: READY FOR 10-POST TEST IMPORT**

## 1. Authoritative source counts

Robust re-parse of the full SQL (60 `wp_posts` INSERT statements, 2308 rows) yielded:

| Item | Count |
|---|---:|
| Total `wp_posts` rows | 2308 |
| Unique post IDs | 2308 |
| Published standard posts | 660 |
| Published pages | 5 |
| Draft posts | 19 |
| Auto-draft | 1 |
| Attachments | 799 |
| Revisions | 806 |
| Nav menu items | 12 |
| Custom post types | 6 |
| Trash | 0 |
| Authors (`wp_users`) | 1 |
| Categories | 14 |
| Tags | 89 |
| `wp_postmeta` rows | 5351 |

## 2. 660 vs 397 discrepancy

The earlier 397 count came from `scripts/parse_wp_sql.py`, which lost 698 rows (parsed 1610/2308). Root causes: incomplete INSERT-chunk discovery (55 vs 60), tuple splitting breaking on parentheses in multiline content, and column misalignment from mishandled escapes. The parser was rewritten with a robust state machine; counts now reconcile to the original SQL. Original SQL was not modified.

## 3. 437 vs 196 discrepancy

Robust parse shows **437 of 660 published posts have genuinely empty `post_content`**. All 437 have a featured image and title; none has excerpt or `post_content_filtered`. The Phase 1.6 count of 196 was an artifact of running on the incomplete 397-post intermediate file (263 published posts, 241 of them empty-body, were never seen). `196 + 241 = 437`. Classification: image-led pending review = 437; other buckets = 0.

## 4. Source-to-normalized completeness

- Intermediate JSON regenerated: 2308 rows, 660 published posts.
- `npm run validate` passes all checks (counts, uniqueness, slug non-emptiness, author presence, featured-image resolution).
- No source IDs missing or duplicated in intermediate JSON.
- Intentionally excluded records documented: revisions, attachments, drafts, auto-draft, nav menu items, custom post types (all excluded from post migration by type/status, retained as source).
- 6 malformed inline image blocks (no src/id) flagged for manual review.

## 5. Sanitizer implementation and tests

- Implemented allowlist sanitizer in `src/lib/sanitizeHtml.ts`.
- Strips scripts, iframes, forms, event handlers, unsafe URL schemes; preserves safe text/links/lists/headings/images.
- `PortableTextRenderer.tsx` now sanitizes `rawHtml` before `dangerouslySetInnerHTML`.
- Tests: `npm run test:sanitize` — PASS (7 cases).

## 6. Image-mapping readiness

- WP attachment ID -> source path (`guid`) mapping verified via `att_path`.
- Featured image (`_thumbnail_id`) resolves for all published posts with thumbnails.
- Inline image blocks retain `wpAttachmentId`, `src`, `alt`, `caption`, `_needsAsset: true`.
- 275 inline image blocks; 0 unresolved IDs; 6 empty blocks flagged for manual review.
- Local file existence distinguished from remote upload; no asset claimed migrated until remote refs verified.

## 7. Acceptance tests

- `npm run validate`: PASS
- `npm run test-slug`: PASS
- `npm run transform:test`: PASS
- `npm run test:sanitize`: PASS
- `npm run test:image`: PASS
- `npm run typecheck`: PASS

## 8. Remaining risks

- 437 image-led posts require content policy decision before full migration.
- 6 malformed inline image blocks need manual review.
- Sanitizer is allowlist/regex-token based; production hardening with DOMPurify recommended.
- Authenticated Studio behavior not verified (no credentials).
- Remote Sanity asset uploads not yet performed; `_needsAsset` remains true.

## Final verdict

READY FOR 10-POST TEST IMPORT
