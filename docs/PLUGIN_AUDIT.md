# WordPress plugin / feature audit (from `wp_options.active_plugins`, 2026-10-30)

Active theme: **Adore News** (`template`/`stylesheet` = adore-news). Elementor, Hello Elementor and the
Twenty* themes are installed but **not** active; article content is Gutenberg blocks (223 posts + 5 pages) or empty (437 image-led posts).

| Plugin (active) | What it actually did | Decision |
|---|---|---|
| Yoast SEO (+Premium) | Sitemap, meta, OG. **No custom titles/descriptions stored** (0 `_yoast_wpseo_title/metadesc`); 29 posts had a focus keyword/primary category | Replaced by `generateMetadata`, `sitemap.xml`, canonical, OG, JSON-LD. SEO fields exist in Studio. Premium redirects table is empty |
| Contact Form 7 (form 7) | Footer widget `footer-4`: name*, email*, subject*, message | Rebuilt: `ContactForm` + `/api/contact` (SMTP via env, honeypot, validation). **Needs `SMTP_URL`/`CONTACT_TO`** |
| Insert Headers and Footers | One header script: **Google AdSense** (`ca-pub-5681729675386373`) | Kept as `siteSettings.adsensePublisherId`; script only loads on `VERCEL_ENV=production` |
| Jetpack / Jetpack Social | Stats, publicize (auto-share to social), sharedaddy | Stats → not migrated (use Vercel Analytics or GA if wanted). Share buttons: WhatsApp/Facebook/X/Telegram links. Auto-publicize not replicated |
| Meta Tag Manager | `mtm_data` empty | Nothing to migrate |
| Disable Right Click | Blocked context menu | **Deliberately omitted** (not security, hurts accessibility) |
| Limit Login Attempts, Really Simple SSL, WP Let's Encrypt | WordPress login / HTTPS | Not applicable: no WP login; HTTPS by Vercel |
| WP Rocket | Page cache/CSS optimisation | Replaced by Next.js ISR + Sanity CDN images |
| Comments | 1,082 comments, **all unapproved** | Not migrated, not displayed. Archived in `migration/work/normalized/comments-archive.json` (PII, git-ignored) |

Theme features recreated: top bar (date + social), logo, primary menu (8 category links), 5-tile banner
from the 3 configured banner posts, latest posts + sidebar, category/tag/search/author archives, breadcrumbs, pagination.
Breaking-news ticker and subscription sections were **disabled** in the theme settings → not built.
