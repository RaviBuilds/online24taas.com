# Production cut-over checklist

State after Phase 4 (2026-11-01). DNS, the public domain and the old WordPress hosting are **untouched**.
Every step in section C needs an explicit go-ahead.

## A. Done and verified

- [x] Sanity access: `write2ravi14@gmail.com` is administrator of `mkiaioc7`. Do not use the old `blogspageagency@gmail.com` login for this project.
- [x] Production migration run and re-verified against the live dataset (`VERIFY OK`, `RECONCILIATION OK`, integration tests); frozen snapshot with SHA-256 in `sanity-backups/` (`docs/BACKUPS_AND_RECOVERY.md`).
- [x] Vercel project `online24taas-web` (team `write2ravi14gmailcoms-projects`, Hobby) created from this repo; CLI login done by the owner.
- [x] Vercel env vars: `NEXT_PUBLIC_SANITY_PROJECT_ID/DATASET/API_VERSION` (Production + Preview), `NEXT_PUBLIC_SITE_URL=https://www.online24taas.com` (Production only; Preview derives its own URL), `SANITY_REVALIDATE_SECRET` (Production and Preview, different values, *sensitive*).
- [x] Preview deployed: `https://online24taas-preview.vercel.app` (protected by Vercel Authentication; `noindex`, `Disallow: /`).
- [x] Sanity CORS: `https://online24taas-preview.vercel.app` (with credentials, for the embedded Studio login). Only that origin was added.
- [x] Sanity webhook `online24taas-preview-revalidate` → preview `/api/revalidate` (HMAC secret; published content only); create/edit/delete verified end to end in 1–4 s.
- [x] Preview robots: non-production deployments answer `Disallow: /`, `X-Robots-Tag: noindex, nofollow` and a robots meta tag.
- [x] 20 legacy `?p=ID`, `?cat=`, `?page_id=`, `?s=`, `/feed`, upload URLs verified on the preview (301 to the new URLs).
- [x] Studio login with Google, image upload, publish, edit: see `PHASE_4_DEPLOYMENT_READINESS_REPORT.md` for the exact evidence and what still needs the owner's own login.

## B. Owner actions before go-live

- [ ] **Studio login proof**: run `npm run studio:login` once (Google sign-in in a visible browser), then `npm run test:studio` (see README). Until then Google login has not been exercised end to end by an automated run.
- [ ] **SMTP** for the contact form. In Vercel (Production and Preview) set `SMTP_URL`, `CONTACT_TO`, `CONTACT_FROM` (see `.env.example`), redeploy, send one message and confirm it arrives. The old form's recipient was `ajit@online24taas.com`.
- [ ] **AdSense**: the publisher ID `ca-pub-5681729675386373` is in Site settings and in the old WordPress header, so the script is wired (production deployments only). In the AdSense console open *Sites → ads.txt*, copy the exact lines, set Vercel `ADS_TXT` (Production), redeploy, and check `https://<domain>/ads.txt`.
- [ ] **Production domain**: add `www.online24taas.com` (and the apex redirect) in Vercel → Domains. Then:
  - [ ] Sanity → API → CORS: add `https://www.online24taas.com` with credentials.
  - [ ] Sanity webhook for production: URL `https://www.online24taas.com/api/revalidate`, type *document*, filter `_type in ["post","page","category","tag","author","menu","siteSettings","mediaAsset","redirect"]`, projection `{_type, "slug": slug.current}`, drafts off, secret = the Production `SANITY_REVALIDATE_SECRET` (Vercel → Settings → Environment Variables; the value is hidden, so generate a new one with `openssl rand -hex 32`, set it in Vercel and in the webhook).
  - [ ] Remove the preview CORS origin and the preview webhook if the preview is no longer needed.
- [ ] Editors invited in Sanity (Editor role); show them draft → publish.
- [ ] **Credential rotation** (WordPress DB, salts, FTP/hosting, admin): `docs/CREDENTIAL_ROTATION.md`.
- [ ] Revoke the Viewer token `online24taas-migration-test-read` in the old project `qvtcbb1j` and delete the unused dataset `migration-test` there.
- [ ] Google Search Console: add the property and submit `https://www.online24taas.com/sitemap.xml` after cut-over.

## C. Cut-over (needs approval)

1. Lower the DNS TTL 24 h ahead.
2. `vercel deploy --prod` (or promote a verified preview), then add the domain in Vercel.
3. Point DNS (A/CNAME) to Vercel.
4. Confirm HTTPS, `/?p=273` → 301, `/sitemap.xml`, `/feed.xml`, `/ads.txt`, `/robots.txt` (must allow crawling in production), Studio at `/studio`.
5. Keep the WordPress host running (read-only) for ≥ 30 days; keep the backup archive.

## D. Rollback

Re-point DNS to the old host (WordPress untouched). Sanity data is additive and can stay.
