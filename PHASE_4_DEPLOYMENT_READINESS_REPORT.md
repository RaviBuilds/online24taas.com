# Phase 4: production readiness and Vercel preview

Date: 2026-10-31 to 2026-11-01. Project `mkiaioc7`, dataset `production`. Preview: `https://online24taas-preview.vercel.app`.

## Decision

**CONDITIONALLY READY.**

Content, the site, the Vercel preview, the Sanity CORS/webhook integration, the editor workflow in the Studio UI (including image upload) and the
automated cross-browser tests all pass. The status is not "READY FOR PRODUCTION CUTOVER" because five items need the owner and could not be
completed or proven from this environment:

1. **Google sign-in itself.** The Studio workflow passed with an authenticated session injected from the owner's Sanity CLI login, not through the Google page. The owner must sign in once (`npm run studio:login`), then `npm run test:studio` repeats the whole workflow with that real session. Exact steps are in "Studio".
2. **Contact form delivery.** `SMTP_URL`, `CONTACT_TO`, `CONTACT_FROM` are not set; the form answers 503 until they are. At the owner's request no email delivery was tested against a real mailbox.
3. **`ads.txt`.** It must contain the exact lines from the owner's AdSense account (set `ADS_TXT`). Until then `/ads.txt` is 404.
4. **Credential rotation for WordPress/hosting** was prepared but not executed; it needs the hosting control panel (`docs/CREDENTIAL_ROTATION.md`).
5. **Production domain.** Its CORS origin and revalidation webhook can only be created once the domain is attached in Vercel. DNS was not touched.

Nothing found in this phase blocks the cut-over technically; items 1 to 5 are owner actions, listed with exact steps in `docs/CUTOVER_CHECKLIST.md`.

## 1. Production dataset verification and count reconciliation

Live inventory (`node migration/inventory-live.mjs`, stored in `migration/reports/mkiaioc7.production/live-inventory.json`):

| | Count |
|---|---:|
| All documents | **2,302** |
| Application documents | **1,590** |
| Sanity-managed documents | 712 (695 `sanity.imageAsset`, 5 `sanity.fileAsset`, 11 `system.group`, 1 `system.retention`) |

Application documents by type: author 1, category 14, tag 89, mediaAsset 799, post 679 (660 published + 19 drafts), page 5, menu 2, siteSettings 1.

**Reconciling 1,590 with the 1,587 listed.** The earlier list (1 + 14 + 89 + 799 + 660 + 19 + 5) omitted the last three documents:

| Document | Type | Purpose |
|---|---|---|
| `menu-22` | menu | primary navigation: 8 category links (फिल्मी, राशिभविष्य, अध्यात्मिक, आरोग्य, जरा हटके, जोक्स, लव्ह स्टोरीज, स्पोर्ट्स), from the WordPress menu 22 |
| `menu-59` | menu | the four social links of the top bar (Gmail, Facebook, instagram, Twitter; the URLs are the generic ones stored in WordPress) |
| `siteSettings` | siteSettings | title, tagline, logo/favicon, AdSense publisher ID, banner posts 89/105/178, footer text |

Nothing was modified to make counts match.

Assets: 700 asset documents are live = 697 distinct migrated assets + 3 assets left from the earlier seed (unreferenced; 11 of the 14 seed assets are identical files that the migration also uploaded).

**Freeze.** A full post-migration export (1,590 documents, 695 images, 5 other files; 218 MB; SHA-256 in `SHA256SUMS`) was taken before any editorial test.
Editorial changes after this point are preserved; the Phase 4 tests only touched content they created (see "Test hygiene").

## 2. Backups (106 vs 132) and recovery

Full explanation in `docs/BACKUPS_AND_RECOVERY.md`.

* **Tarball, 106 documents** (89 tags, 14 categories, 1 author, 2 posts) plus 14 image files. A Sanity CLI export contains application documents and image files, never Sanity-managed documents.
* **API export, 132 documents** = the same 106 + 14 `sanity.imageAsset` + 11 `system.group` + 1 `system.retention`. The difference of 26 is exactly those three groups.
* All 106 tarball documents equal their API-export versions (one differs only in how an asset reference is written).

**Recovery tested** (scratch dataset `restore-test`, deleted afterwards): importing the tarball alone restored **120 of 120** non-system documents identically (106 documents + 14 image assets). The system documents are platform-managed. Conclusion: the complete pre-existing production content is recoverable from the tarball.
Finding recorded in the document: `sanity dataset export --no-assets` removes image fields from documents, so it must not be used to verify a backup.

## 3. Design work (compared with the Adore News theme)

The original site is no longer reachable (`online24taas.com` does not resolve; the only capture is a CSS-less web.archive.org snapshot, which still confirmed the structure). The reference was therefore the theme source (`templates`, `style.css`) and the WordPress options and custom CSS in the backup.

What the original was, and what was built:

| Area | Original (from theme + options) | Now |
|---|---|---|
| Home | "latest posts" index with banner (posts 89, 105, 178), 3-column card grid, 70/30 layout with right sidebar | same structure, banner grid fills without holes for 1 to 5 tiles |
| Header | dark top bar (red date block, social links), patterned band (the owner's custom CSS, reused), white nav bar with 8 category items and a search icon | same, logo centred in the band (the original showed none; deliberate), hamburger below 1024 px, search opens a form, Escape closes |
| Cards | square-cornered image 1:0.7, red category chips, headline, author · date, excerpt | same, hover zoom disabled for reduced motion |
| Sidebar | one widget: "Latest Post" list | same, sticky on wide screens |
| Pagination | 30 px bordered squares, red current page | same |
| Article | title, date/author, image, content, categories/tags footer, previous/next, related posts (3 cards) | same plus breadcrumb and share links |
| Footer | `#1c1c1c`, four columns (logo and contact text, Trending Stories, Trending Topics + Footer Menu, contact form), centred copyright | same; the links are mapped by their WordPress IDs (`src/lib/footer.ts`) so they show the same articles/categories/pages as before |
| Type | Roboto/Muli, Adore News size scale | Adore News scale; Noto Sans Devanagari (self-hosted) with line-height 1.45 to 1.9 for matras |

Not pixel-compared (nothing to compare against). Deliberate differences: the Marathi UI labels (the original mixed English labels), the logo in the header band, no preloader animation, the scroll-to-top control is a plain button, no `text-transform: uppercase` (meaningless in Devanagari).

## 4. Studio verification

Studio: `https://online24taas-preview.vercel.app/studio` (the Studio is embedded in the site). Test: `e2e/studio-ui.spec.ts`, run against the deployed preview and the production dataset.

**Result: passed (1/1, 8.3 minutes), authenticated with the owner's Sanity session token injected into the browser.** That means the Studio UI, the permissions and the site integration are proven; the Google sign-in screen was not exercised. The injected token is what the previous report called "not proof of Google login", and it remains so.

What the passing run did, all through the browser UI:

1. Opened the Studio as the signed-in user (the navbar shows "ravindra kamble", matching the user the API reports).
2. Created a **category** and a **tag** (Marathi titles, generated Marathi slugs), renamed the category and re-published.
3. Created a **Marathi post**: title, Marathi slug, excerpt, body with bold text. Checked that the **draft is private** (API shows `drafts.*`, the site answers 404 for it).
4. **Uploaded a featured image through the Studio UI**, then filled **alt text and caption** in the UI. Checked in the API.
5. **Inserted an image into the body** through the editor (upload dialog) with alt text.
6. Added the category and the tag to the post through the reference fields.
7. **Published**. Checked: the draft is gone, the published document has everything, and the **site shows it** (article page with title, bold text, category, alt texts, tag; home page; category archive) via the revalidation webhook.
8. **Edited** the published post in the UI (draft created, published version unchanged until re-publish), re-published, and the site showed the edit.
9. **Opened an existing migrated article** (`post-929`), edited the title in the UI (creates a draft), confirmed the published article was unchanged, then **discarded** the change through the UI (Discard changes, Confirm).
10. Deleted everything it created (including the uploaded test images).

**Exact step for the Google-login proof** (needs a display and your Google account; nothing is stored except a browser session file):

```bash
cd online24taas-web
npm run studio:login        # a Chrome window opens at the Studio; sign in with Google as write2ravi14@gmail.com
                            # (and with Vercel first if it asks). Wait until the content list appears; the window can then be closed.
STUDIO_STORAGE_STATE=.auth/studio.json SANITY_USE_CLI_AUTH=1 STUDIO_VERCEL_BYPASS=<bypass secret> npm run test:studio
```

The bypass secret is Vercel project → Settings → Deployment Protection → "Protection Bypass for Automation". `.auth/` is git-ignored.
CORS: the preview origin was added with credentials, which the Google login needs.

**Test hygiene (what went wrong once).** Two earlier test runs were killed while a browser was still open and left test documents in production (one post, tag and category titled `चाचणी …`, two PNG assets, and an edit-draft of `post-929`). They were identified by title and the absence of WordPress IDs, removed, and the dataset re-verified against the baseline: **679 posts, 14 categories, 89 tags, 695 image assets, 19 drafts, 1,590 application documents** (also after the final passing run). `tools/cleanup-studio-test.mjs` now removes such leftovers safely (dry run by default).

## 5. Vercel preview

* Vercel CLI: not installed globally; run with `npx vercel@latest` (v65.9). Not logged in at first; the owner approved the CLI's device login in the browser (account `write2ravi14-1820`, team `write2ravi14gmailcoms-projects`, Hobby).
* No Online24Taas project existed among the account's 20 projects, so `online24taas-web` was created and linked (`.vercel/`, git-ignored).
* **The first `vercel deploy` was assigned to the project's production environment** (Vercel does this for a project's first deployment). It was publicly reachable under `online24taas-web.vercel.app`. It was removed within minutes (404 now) and replaced by a real preview. The public domain was never involved.
* Preview URL: **`https://online24taas-preview.vercel.app`** (stable alias, re-pointed at each new deployment; old deployments removed). Deployment Protection (Vercel Authentication) is on, so it answers 302 to Vercel's login without the bypass secret; `robots.txt` says `Disallow: /`; pages carry `X-Robots-Tag: noindex, nofollow` and a robots meta tag; canonical URLs use the preview host.
* Config: `vercel.json` (Next.js, `npm ci`, region `bom1`), `engines.node = 22.x` (the project default was 26.x), `.vercelignore` (no secrets or raw data upload), `.env.example` rewritten.
* Environment variables (names only):

| Variable | Production | Preview | Browser-visible |
|---|:-:|:-:|:-:|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` = `mkiaioc7` | yes | yes | yes (public identifier) |
| `NEXT_PUBLIC_SANITY_DATASET` = `production` | yes | yes | yes |
| `NEXT_PUBLIC_SANITY_API_VERSION` | yes | yes | yes |
| `NEXT_PUBLIC_SITE_URL` = `https://www.online24taas.com` | yes | no (previews use their own URL) | yes |
| `SANITY_REVALIDATE_SECRET` (random 256-bit, different per environment, *sensitive*) | yes | yes | no |
| `SMTP_URL`, `CONTACT_TO`, `CONTACT_FROM`, `ADS_TXT`, `SANITY_API_READ_TOKEN` | not set | not set | no |

No Sanity read token is needed because the dataset is public-read; there is no write token on Vercel.

## 6. Sanity CORS and webhook

* CORS: added exactly `https://online24taas-preview.vercel.app` **with credentials** (needed because the Studio is served from that origin and uses the Sanity login session). The two pre-existing origins (`http://localhost:3333`, `http://localhost:3000`) are unchanged. The production domain is not added yet.
* Webhook `online24taas-preview-revalidate` (id `6r06HTa1gRiCnbrD`): document type, create/update/delete, published documents only (drafts off), filter on the content types, projection `{_type, "slug": slug.current}`, HMAC secret, plus the Vercel bypass header because the preview is protected. The bypass secret is visible to Sanity project administrators; use a dedicated secret for production, which is not protected and needs no header.
* The endpoint `/api/revalidate` verifies the HMAC (constant-time), rejects timestamps older than an hour, limits the body size, and answers 503 when the secret is missing, 401 for a missing/forged/tampered/stale signature, 405 for GET.
* **Tested end to end:** a temporary post was published, edited and deleted in the production dataset; the preview showed each change after **4.4 s, 1.3 s and 1.2 s** (home page 1.0 s / 1.3 s), Sanity logged 3 deliveries, all HTTP 200. The temporary post was deleted (0 left).
* To avoid a race with Sanity's CDN the site now reads the Sanity API directly (`useCdn: false`) and relies on Next's data cache plus the webhook.

## 7. Defects found and fixed in this phase

| Defect | How found | Fix |
|---|---|---|
| **Every Marathi article returned HTTP 500 on Vercel** (659 of 660 articles). Per-article cache tags `post:<Marathi slug>` are sent in the `x-next-cache-tags` HTTP header, which must be ASCII. | The Studio test checked that a not-yet-published Marathi slug is 404; the preview answered 500. Vercel runtime logs: `Invalid character in header content ["x-next-cache-tags"]`. A local `next start` does not send that header, so earlier local tests could not see it. | Hashed ASCII tags in one shared function (`src/lib/cache-tags.ts`), used by the pages and the webhook; unit and server tests added. |
| Widget headings used line-height 1.25 (below the 1.3 minimum for Devanagari) | new responsive matrix | 1.45 |
| In Firefox, aborted viewport prefetches made the router fall back to full page reloads, racing the next click | Firefox matrix | prefetch disabled site-wide (`AppLink`); also saves requests |
| Preview pages had no robots meta tag and `/studio` lacked the noindex header | review | added (non-production deployments only; production unaffected) |
| No Open Graph image fallback, no description on static/paginated pages, no `WebSite` JSON-LD on the home page | SEO audit | added a default Open Graph image (`public/og-default.png`, the site logo on a 1200×630 card) on every page, description fallback, `WebSite` + `Organization` JSON-LD with SearchAction |
| First `vercel deploy` went to the production environment | review of the deploy output | removed (see Vercel preview) |

## 8. Contact form

Implementation (`src/lib/contact.ts`, `src/app/api/contact/route.ts`, `src/components/ContactForm.tsx`): server-side validation of name/e-mail/subject/message with Marathi error messages per field; header-injection safe (control characters removed); honeypot field; render-time stamp (submissions faster than 2.5 s or older than 24 h are silently dropped); at most 2 links per message; same-origin check; JSON-only; 16 KB body limit; rate limit (5 per 10 minutes per IP, 100 per hour overall; per server instance, so add a Vercel Firewall rule for a hard limit); timeouts on the SMTP connection; no message body or credentials in logs; accessible form (labels, `aria-invalid` with `aria-describedby`, focus moves to the first invalid field, success in `role=status`, errors in `role=alert`).

Environment variables the owner must set (Production and Preview): `SMTP_URL` (for example `smtps://USER:PASSWORD@smtp.example.com:465`, with special characters in the password URL-encoded), `CONTACT_TO` (the receiving mailbox; the old form sent to `ajit@online24taas.com`), `CONTACT_FROM` (an address the SMTP account may send from; defaults to `CONTACT_TO`).

Status: **complete in code, not configured.** Without `SMTP_URL` and `CONTACT_TO` the endpoint answers 503 with a Marathi message. Tests: 10 unit tests (validation, injection, limits, rate limiter, config) and server tests with a throw-away SMTP socket on `127.0.0.1` inside the test process; browser tests use mocked responses for success, field error, 429, 503, 502 and network failure. No message was sent to any real mailbox.

## 9. AdSense

* Script: `pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5681729675386373` is loaded once, from the public site layout, only when `VERCEL_ENV=production` (never on previews or locally). The publisher ID comes from Site settings (it is the one the old WordPress header used). The Studio has its own layout and loads no ads. The script is also present on the 404 page; if Google objects to ads on error pages, restrict it there.
* Verified: absent in preview HTML (test), present only in production by construction. Ad placement (including on mobile) is controlled in the AdSense console; the code adds no fixed ad slots and no placeholder ads. Whether ads actually render can only be checked on the live domain after Google approves it.
* `ads.txt`: the old site had none. `/ads.txt` serves exactly the text in `ADS_TXT` and answers 404 otherwise. **Owner step:** AdSense console → Sites → ads.txt → copy the shown lines into Vercel `ADS_TXT` for Production (use `\n` between lines), redeploy, open `/ads.txt`. A test checks the exact output format.

## 10. Security

| Check | Result |
|---|---|
| Secrets in Git | None. All 7 commits scanned for Sanity tokens, private keys, WordPress DB/keys/salts definitions, SMTP URLs with passwords, AWS/Vercel tokens, and the known leaked passwords (the SMTP hit is a documentation placeholder). No `.env`, `.sql`, archive or credential file is tracked. |
| Secrets in browser bundles | None: the revalidate secret, the Vercel bypass secret and the Sanity session token were searched in the local `.next/static` and in every JS chunk and HTML page served by the preview (homepage and `/studio`, 25 chunks); no private variable names either. |
| Sanity permissions | Anonymous visitors: read published content only (0 drafts visible), create is rejected (HTTP 403), system groups not readable. One administrator (the owner); robot members: only "MCP agent readonly" (Viewer). |
| MCP agent read/write token | **Revoked.** It was a project robot token (Editor, created 2026-10-14). Evidence it was unused: none of the MCP configurations on this machine (VS Code, Cursor, Claude, Cline, Copilot CLI) reference a robot token (they use the owner's personal token); all 96 write transactions on 791 documents were authored by the owner, none by robot members. It can be recreated in a minute if an agent needs it. The read-only token was left in place. |
| Revalidate/preview endpoints | HMAC + timestamp window + size limit; preview behind Vercel Authentication; verified negative cases on the deployment (no signature 401, forged 401, no bypass 302). |
| Security headers | HSTS (Vercel), `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`; noindex on Studio. No Content-Security-Policy yet (the Studio and AdSense need a careful policy; recommended as a follow-up). |
| `.gitignore` | covers env files, `.vercel/`, `.auth/`, raw SQL, archives, migration work files, test output. |
| WordPress credentials | **Not rotated.** The database password and keys/salts are in `wp-config.php`, `APP-META.INI`; admin and FTP passwords in `online24taas.txt`; a screenshot of credentials in a `.jpg`. Rotating needs the hosting panel and a coordinated edit of `wp-config.php`; using the leaked credentials from here to "test" them would be unauthorised. The runbook with the exact order is `docs/CREDENTIAL_ROTATION.md`. `online24taas.com` does not resolve, so the WordPress site may already be offline. |
| Incidental exposure during this review | Reading `online24taas.txt` printed its plaintext passwords in this session's terminal log; and a scan printed a Viewer read token for the old test project from the git-ignored `.env.rehearsal.local`. Both belong to the lists above: treat those passwords as compromised and rotate them, and revoke the old project's token (it belongs to another Sanity account that this login cannot manage). |

## 11. Mobile, browsers and accessibility

Tests: `e2e/site.spec.ts` (28 tests, desktop and Pixel 7 emulation) and `e2e/responsive.spec.ts` (a matrix over 320, 375, 412, 768, 1024, 1280 and 1920 px). Per page type (home, 4 article types, category, static page, paginated list, search results, 404) the matrix checks: no horizontal overflow of the document or of any element, images load and are not distorted or wider than the screen, headings and paragraphs do not clip, line-height ≥ 1.3 (Devanagari), one `h1`, `main` landmark, every `img` has an `alt`, `lang="mr"`, no console errors. Interaction checks: the mobile menu (≥ 40 px tap target, `aria-expanded`, Escape closes, closes after navigating), the search (opens, focuses, Marathi query works), pagination (current page marked, next/previous), the footer (four areas visible, scroll-to-top), and the contact form's accessible feedback (mocked).

Results: **Chrome 53 of 53 passed** (all 7 viewports; page types at 375, 768 and 1280 px, the core pages at the other widths) and **Firefox 24 of 24 passed** (375 and 1280 px). Findings along the way were real defects and are listed in section 7 (line-height, Firefox reloads); the other early failures were defects in the test helper itself (screen-reader-only text counted as clipped, `scroll-behavior: smooth` swallowing scripted scrolls, trace recording on a loaded machine). Full-page screenshots of home, an image-heavy article and a category page at each width are in `test-results/matrix/` (git-ignored, regenerated by the run).

Not covered: real phones and Safari/WebKit (WebKit cannot start on this machine: it needs system libraries that need root to install). The Chrome emulation covers viewport size and touch input, not iOS rendering. Recommended before launch: open the preview on one Android and one iPhone.

## 12. Performance and SEO

Metadata and structured data (verified on the preview): `lang="mr"`, canonical URLs, title/description, Open Graph (title, description, image, type, url, locale) and Twitter card on every page, with the default image when an article has no featured image (checked on all page types on the final preview), `NewsArticle` + `BreadcrumbList` JSON-LD on articles, `BreadcrumbList` on archives and pages, `WebSite` + `Organization` (SearchAction) on the home page, one `h1` per page, search results `noindex,follow`, sitemap with 752 URLs (660 articles, no drafts) on the right host, RSS feed (30 items, Marathi), `robots.txt` (production: allow all except `/studio`, `/api/`, `/search`; non-production: disallow all).
Redirects: `?p=ID`, `?page_id=`, `?cat=`, `?s=`, `/feed`, `/wp-content/uploads/…` all answer 301; **20 of 20** sampled `?p=ID` URLs from the redirect map redirect to the mapped article, which answers 200.
Images: custom loader to the Sanity CDN with width and quality parameters, `sizes` per layout, lazy loading except the first tiles; the LCP image now has `fetchpriority=high`. Fonts: self-hosted variable Noto Sans Devanagari (119 KB) and Roboto, `display: swap`, no third-party font request. Caching: pages are static with 5-minute revalidation plus on-demand revalidation by the webhook; the sitemap revalidates hourly.

Lighthouse 13 (lab, run against the final preview, headless Chrome, simulated mobile/desktop throttling):

| Page | Perf | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| Home, mobile | 32 | **100** | 100 | 61* | 4.4 s | 6.6 s | 4.3 s | 0 |
| Article, mobile | 35 | **100** | 100 | 61* | 3.3 s | 7.2 s | 8.8 s | 0 |
| Home, desktop | 44 | **100** | 100 | 61* | 1.4 s | 2.7 s | 1.2 s | 0 |
| Article, desktop | 47 | **100** | 100 | 61* | 1.3 s | 2.4 s | 1.3 s | 0 |

An earlier run (before the accessibility fix and the `fetchpriority` change) gave accessibility 96 and performance 34 / 42 / 52 / 49 in the same order, with FCP 3.0 s, LCP 8.9 s and CLS 0 on the home page (mobile).

\* The SEO score is low only because the preview is intentionally not indexable (`Disallow: /`, noindex); the other SEO audits pass.
**These performance numbers must be read with care.** Lighthouse reported on every run that this machine's CPU is slower than its calibration expects (benchmark index 146 to 328 between runs, against roughly 500 or more for an ordinary laptop; other heavy jobs were running), which inflates Total Blocking Time, LCP and the run-to-run spread; they are lab values and not Core Web Vitals field data (no real-user data exists yet). The remaining findings are real but modest: about 90 KB of unused JavaScript in shared chunks, 59 KB of image savings, one small render-blocking stylesheet (8 KB). Total page weight is 677 KB. The Sanity Studio is not in the public pages' bundles. **Re-measure on the production domain and in Search Console / PageSpeed Insights after launch**; no ranking improvement is claimed.

## 13. Test summary

| Suite | Result |
|---|---|
| Unit (`npm test`) | 78 of 78 passed |
| Server (`npm run test:server`) | 7 of 7 passed (webhook signature accepted/rejected, ASCII-only tags, SMTP delivery to a local socket, `ads.txt`, no AdSense script outside production) |
| Site e2e (`e2e/site.spec.ts`) on the production build | 28 of 28 passed on the final build (1 further opt-in Studio test is `e2e/studio-ui.spec.ts`) |
| Responsive matrix, Chrome | 53 of 53 passed (run on the build immediately before the last metadata-only change; the final build re-ran the site suite and unit/server tests) |
| Responsive matrix, Firefox | 24/24 passed |
| Studio UI workflow on the preview | 1/1 passed (token session) |
| Studio workflow with Google login | not run (needs the owner) |
| `tsc --noEmit`, ESLint | 0 errors (8 warnings in migration scripts) |
| Legacy URL sample on the preview | 20/20 |

Notes on test infrastructure: the matrix runs with `--trace=off` on this machine, because Playwright's trace recording on a shared 2-core machine made Firefox runs time out without any site problem; an interrupted run is cleaned up by `tools/cleanup-studio-test.mjs`.

## 14. Outstanding manual actions (consolidated)

1. Google sign-in proof: `npm run studio:login`, then `npm run test:studio` (section 4).
2. Set `SMTP_URL`, `CONTACT_TO`, `CONTACT_FROM` in Vercel (Production and Preview), redeploy, send one test message yourself.
3. Set `ADS_TXT` from the AdSense console (Production), redeploy.
4. Attach `www.online24taas.com` in Vercel; add it as a CORS origin (with credentials) in Sanity; create the production webhook (`docs/CUTOVER_CHECKLIST.md` §B); remove the preview origin/webhook when the preview is no longer needed.
5. Rotate WordPress, database, hosting and FTP credentials; delete the files that contain them (`docs/CREDENTIAL_ROTATION.md`). Revoke the old Viewer token in Sanity project `qvtcbb1j`.
6. Check the preview on a real Android phone and an iPhone.
7. Optional hardening: a Content-Security-Policy, a Vercel Firewall rate-limit rule for `/api/contact`, 2-step verification on Vercel, Sanity and Google accounts.
8. Approve the DNS cut-over when ready (lower the TTL a day before; rollback is re-pointing DNS to the old host).

An unrelated Thunderbird window composing mail to `harbor@meridiandental.test` is open on this machine. It was started by the desktop session, not by anything in this project's tests (its parent is `systemd --user`).
