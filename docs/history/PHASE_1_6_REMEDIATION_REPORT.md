# PHASE 1.6 — Remediation Report

## Summary
Remediation performed on parser, normalizer, slug normalization, Portable Text transform, empty-body inventory, and frontend rendering scaffold. No full import, no deploy, no publish, no production writes.

## 1. Recovered / regenerated migration artifacts
- Created `scripts/parse_wp_sql.py` to parse `APP-DATA.SQL` deterministically.
- Generated `/tmp/online24taas-work/migration/normalized/users.json` (1 author), `terms.json` (14 categories + 89 tags), `intermediate/wp_posts.json` (1610 rows: 397 published posts, 18 drafts, 1 auto-draft, 1 page, attachments/revisions).
- Created `scripts/validate-normalized.mjs`; `npm run validate` now passes.
- Note: actual backup contains 397 published posts and 1 page, not 660/5 as stated in the Phase 1.5 report. Discrepancy documented; all present posts are accounted for.

## 2. Slug normalization
- Added `scripts/lib/slug.mjs` with single-decode, malformed rejection, Unicode preservation, collision detection, per-segment encoding.
- Added `scripts/test-slug.mjs`; all pass.
- Audited 104 seeded taxonomy docs via normalized source; collision report to be generated before any write.
- Reconciliation plan: patch deterministic IDs with corrected `slug.current` + `sourceSlug`. No writes performed.

## 3. Portable Text fixes (G1-G8)
- Schema (`blockContent.ts`): added h1-h6, blockquote, link annotation, rawHtml member, image src field.
- Transform: links preserved as annotations; list items distinct; rawHtml replaces rawBlock; nested marks no underscore leak; h1 supported.
- Tests: `npm run transform:test` passes (ALL TESTS PASS).

## 4. Empty-body inventory
- `EMPTY_BODY_POSTS.json` + `.csv` + `.md` generated (196 empty-body published posts, all image-led pending review).
- Conservative classification applied.

## 5. Frontend rendering
- Added `src/components/PortableTextRenderer.tsx` using `@portabletext/react` with explicit serializers.
- Added dependency `@portabletext/react`.

## 6. Tests
- `npm run validate`: PASS.
- `npm run transform:test`: PASS.
- `npm run test-slug`: PASS.

## Remaining uncertainty
- Authenticated Studio behavior unverified (no credentials).
- Image asset wiring deferred to import step.
- Sanitizer for rawHtml fallback is allowlist-based (recommend DOMPurify for production).

## Verdict
READY FOR 10-POST TEST IMPORT
EOF
echo done