# Production cut-over checklist (nothing here has been executed)

DNS, the public domain and the old WordPress hosting are **untouched**. Every step below needs an explicit go-ahead.

## A. Access still required (single blocker)
The CLI login in this environment (`blogspageagency@gmail.com`) is **not a member of Sanity project `mkiaioc7`**
(`projectUserNotFoundError`); it only administers `qvtcbb1j` ("freelance-sanity"). To migrate into `mkiaioc7`, one of:
1. invite that account to `mkiaioc7` as Editor/Administrator, then run `docs/RUNBOOK.md` §6; or
2. create an Editor API token for `mkiaioc7` and run the scripts with `SANITY_API_WRITE_TOKEN`; or
3. decide to use `qvtcbb1j` as the real project (it already holds the verified full migration in dataset `migration-test`;
   free plan allows 2 datasets, so promoting means exporting/importing into its `production` dataset — also needs your OK).

## B. Before go-live
- [ ] Run the production migration (§6 of the runbook) and see `VERIFY OK` + integration tests green against `mkiaioc7`.
- [ ] Vercel project created from this repo; env vars from `.env.example` (`NEXT_PUBLIC_SANITY_*`, `NEXT_PUBLIC_SITE_URL=https://www.online24taas.com`, `SANITY_REVALIDATE_SECRET`, `SMTP_URL`, `CONTACT_TO`, `CONTACT_FROM`; `SANITY_API_READ_TOKEN` only if the dataset is private).
- [ ] Sanity → API → CORS origins: add the Vercel preview URL(s) and the production domain **with credentials** (Studio login).
- [ ] Sanity webhook → `https://<domain>/api/revalidate`, secret = `SANITY_REVALIDATE_SECRET`, projection `{_type, "slug": slug.current}`, trigger create/update/delete.
- [ ] Deploy a **preview**; run `E2E_BASE_URL=https://<preview> npx playwright test`; check Studio login, create/publish a test post, delete it.
- [ ] Preview robots: non-production deployments return `Disallow: /` automatically (verify).
- [ ] Spot-check 20 random `?p=ID` URLs from `migration/reports/*/legacy-redirect-map.csv` on the preview.
- [ ] Editors invited in Sanity (Editor role); show them draft → publish.
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
- Sanity: a Viewer token `online24taas-migration-test-read` was created in `qvtcbb1j` for local testing and CORS origin `http://localhost:3100` was added; revoke when no longer needed.
