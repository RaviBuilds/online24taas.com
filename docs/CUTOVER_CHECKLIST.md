# Production cut-over checklist (migration done; nothing below section B has been executed)

DNS, the public domain and the old WordPress hosting are **untouched**. Every step below needs an explicit go-ahead.

## A. Sanity access (resolved 2026-10-31)
`write2ravi14@gmail.com` is administrator of `mkiaioc7`; the production migration is done and verified (see `MIGRATION_ACCEPTANCE_REPORT.md`).
Do not use the old `blogspageagency@gmail.com` login for this project.

## B. Before go-live
- [x] Production migration run; `VERIFY OK` + `RECONCILIATION OK` + integration tests green against `mkiaioc7` (2026-10-31).
- [ ] Vercel project created from this repo; env vars from `.env.example` (`NEXT_PUBLIC_SANITY_*`, `NEXT_PUBLIC_SITE_URL=https://www.online24taas.com`, `SANITY_REVALIDATE_SECRET`, `SMTP_URL`, `CONTACT_TO`, `CONTACT_FROM`; `SANITY_API_READ_TOKEN` only if the dataset is private).
- [ ] Sanity → API → CORS origins: add the Vercel preview URL(s) and the production domain **with credentials** (Studio login).
- [ ] Sanity webhook → `https://<domain>/api/revalidate`, secret = `SANITY_REVALIDATE_SECRET`, projection `{_type, "slug": slug.current}`, trigger create/update/delete.
- [ ] Deploy a **preview**; run `E2E_BASE_URL=https://<preview> npx playwright test`; check Studio login, create/publish a test post, delete it.
- [ ] Preview robots: non-production deployments return `Disallow: /` automatically (verify).
- [ ] Spot-check 20 random `?p=ID` URLs from `migration/reports/*/legacy-redirect-map.csv` on the preview.
- [ ] Editors invited in Sanity (Editor role); show them draft → publish.
- [ ] `ads.txt`: add the Google AdSense line (`google.com, pub-5681729675386373, DIRECT, f08c47fec0942fa0`, confirm in the AdSense console) as a route or `public/ads.txt`; none exists in the old backup.
- [ ] SMTP configured and one contact-form message received.
- [ ] Google Search Console: add new property/sitemap `https://www.online24taas.com/sitemap.xml` after cut-over.

## C. Cut-over (needs approval)
1. Lower DNS TTL (24 h ahead). 2. Add the domain in Vercel. 3. Point DNS (A/CNAME) to Vercel. 4. Confirm HTTPS, `/?p=273` → 301, `/sitemap.xml`, `/feed.xml`.
5. Keep the WordPress host running (read-only) for ≥ 30 days; keep the backup archive.

## D. Rollback
Re-point DNS to the old host (WordPress untouched). Sanity data is additive and can stay.

## E. Security follow-ups (not done automatically)
- WordPress secrets were exposed in `wp-config.php`, `APP-META.INI`, `online24taas.txt`, `online24taas.com credentials.jpg`. **Not rotated** (would interrupt the live site). Rotate DB password, salts, hosting/FTP/cPanel logins after cut-over.
- Delete the stray 450 MB `Unconfirmed 633112.crdownload` and keep the credential files out of any cloud sync.
- Sanity project `mkiaioc7` has two robot tokens from an earlier setup (`MCP agent read/write` = editor, `MCP agent readonly`); revoke the read/write one if no longer needed.
- Sanity: a Viewer token `online24taas-migration-test-read` was created in `qvtcbb1j` for local testing and CORS origin `http://localhost:3100` was added; revoke when no longer needed.
