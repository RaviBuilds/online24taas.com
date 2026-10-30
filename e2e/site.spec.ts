import { expect, test, type Page } from '@playwright/test';
import { categories, drafts, enc, pages, post, posts, tags } from './fixtures';

// Collect console errors / failed same-origin requests on every page load.
async function watch(page: Page) {
  const problems: string[] = [];
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('response', (r) => r.status() >= 400 && !r.url().includes('favicon') && problems.push(`${r.status()} ${r.url()}`));
  return problems;
}
const allImagesLoaded = (page: Page) =>
  page.evaluate(async () => {
    const imgs = [...document.images];
    imgs.forEach((i) => { i.loading = 'eager'; }); // lazy images below the fold would otherwise never complete
    await Promise.all(imgs.map((i) => (i.complete ? Promise.resolve() : new Promise((r) => { i.onload = i.onerror = () => r(null); }))));
    return imgs.filter((i) => i.naturalWidth === 0).map((i) => i.currentSrc || i.src);
  });

test.describe('home', () => {
  test('renders Marathi layout, banner tiles, latest list, pagination; no errors; images load', async ({ page }) => {
    const problems = await watch(page);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'mr');
    await expect(page.getByRole('heading', { name: 'ताज्या बातम्या' }).first()).toBeVisible();
    await expect(page.locator('section[aria-label="ठळक बातम्या"] article')).toHaveCount(4, { timeout: 5000 }).catch(async () => {
      expect(await page.locator('section[aria-label="ठळक बातम्या"] article').count()).toBeGreaterThanOrEqual(3);
    });
    await expect(page.locator('article h2 a').first()).toContainText(/[\u0900-\u097F]/);
    await expect(page.getByRole('navigation', { name: 'पृष्ठे' })).toBeVisible();
    expect(await allImagesLoaded(page)).toEqual([]);
    expect(problems).toEqual([]);
  });

  test('font stack serves Devanagari with adequate line height', async ({ page }) => {
    await page.goto('/');
    const h = page.locator('article h2').first();
    const style = await h.evaluate((el) => { const s = getComputedStyle(el); return { fam: s.fontFamily, lh: parseFloat(s.lineHeight) / parseFloat(s.fontSize) }; });
    expect(style.fam).toMatch(/Devanagari/i);
    expect(style.lh).toBeGreaterThanOrEqual(1.3);
  });

  test('banner posts follow Site settings (89, 105, 178)', async ({ page }) => {
    await page.goto('/');
    const banner = page.locator('section[aria-label="ठळक बातम्या"]');
    for (const id of [89, 105, 178]) await expect(banner.getByRole('link', { name: post(id).title })).toBeVisible();
  });
});

test.describe('articles', () => {
  test('text article: title, date, headings, lists, inline images, tags, share, related, JSON-LD', async ({ page }) => {
    const p = post(2584);
    const problems = await watch(page);
    await page.goto(`/blog/${enc(p.slug)}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(p.title);
    await expect(page.locator('.entry-content h2, .entry-content h3').first()).toBeVisible();
    expect(await page.locator('.entry-content ul li').count()).toBeGreaterThanOrEqual(3);
    expect(await page.locator('.entry-content ol li').count()).toBeGreaterThanOrEqual(4);
    expect(await page.locator('.entry-content figure img').count()).toBe(2);
    expect(await allImagesLoaded(page)).toEqual([]);
    await expect(page.getByText('शेअर करा:')).toBeVisible();
    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').allTextContents()).find((t) => t.includes('NewsArticle'))!);
    expect(ld.headline).toBe(p.title);
    expect(ld.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(problems).toEqual([]);
  });

  test('the full Marathi text of the source article is on the page (no truncation / corruption)', async ({ page }) => {
    for (const id of [2584, 472, 89]) {
      const p = post(id);
      await page.goto(`/blog/${enc(p.slug)}`);
      const html = p.content.replace(/<!--[\s\S]*?-->/g, '');
      const sourceWords = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').split(/\s+/).filter((w) => /[\u0900-\u097F]/.test(w));
      const body = (await page.locator('.entry-content').innerText()).replace(/\s+/g, ' ');
      const missing = sourceWords.filter((w) => !body.includes(w));
      expect(missing, `post ${id}`).toEqual([]);
      expect(body).not.toMatch(/[\uFFFD]|%E0%A4|à¤/);
    }
  });

  test('image-led post (empty body) shows its featured image and invents no text', async ({ page }) => {
    const p = posts.find((x) => x.id === 273)!;
    expect(p.imageLed).toBe(true);
    await page.goto(`/blog/${enc(p.slug)}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(p.title);
    const img = page.locator('article figure img').first();
    await expect(img).toBeVisible();
    expect(await img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(100);
    await expect(page.locator('.entry-content')).toHaveCount(0);
  });

  test('raw-HTML fallback: Amazon ad iframe is kept, scripts are not', async ({ page }) => {
    await page.goto(`/blog/${enc(post(675).slug)}`);
    expect(await page.locator('.entry-content iframe').count()).toBeGreaterThan(0);
    for (const f of await page.locator('.entry-content iframe').all()) expect(await f.getAttribute('src')).toMatch(/amazon-adsystem\.com/);
    expect(await page.locator('.entry-content script').count()).toBe(0);
  });

  test('centered paragraph and colour marks are preserved', async ({ page }) => {
    await page.goto(`/blog/${enc(post(929).slug)}`);
    expect(await page.locator('.entry-content p.text-center').count()).toBeGreaterThan(0);
    await page.goto(`/blog/${enc(post(662).slug)}`);
    expect(await page.locator('.entry-content span[style*="color:"]').count()).toBeGreaterThan(0);
  });

  test('canonical, Open Graph, Twitter and robots metadata', async ({ page, baseURL }) => {
    const p = post(2584);
    await page.goto(`/blog/${enc(p.slug)}`);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toMatch(new RegExp(`^https?://[^/]+/blog/${enc(p.slug)}$`));
    // canonical origin = configured NEXT_PUBLIC_SITE_URL; og:url must agree with it
    expect(await page.locator('meta[property="og:url"]').getAttribute('content')).toBe(canonical);
    expect(await page.locator('meta[property="og:title"]').getAttribute('content')).toBe(p.title);
    expect(await page.locator('meta[property="og:type"]').getAttribute('content')).toBe('article');
    expect(await page.locator('meta[property="og:locale"]').getAttribute('content')).toBe('mr_IN');
    expect(await page.locator('meta[name="twitter:card"]').getAttribute('content')).toBe('summary_large_image');
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toMatch(/[\u0900-\u097F]/);
    void baseURL;
  });

  test('unknown slug and draft slug return 404 (drafts never public)', async ({ page }) => {
    expect((await page.goto('/blog/does-not-exist'))!.status()).toBe(404);
    const draft = drafts.find((d) => d.id === 83)!;
    expect((await page.goto(`/blog/${enc(draft.slug)}`))!.status()).toBe(404);
    await page.goto('/blog');
    await expect(page.getByText(draft.title, { exact: true })).toHaveCount(0);
  });
});

test.describe('taxonomy, pages, search, pagination', () => {
  test('category archive lists its posts and paginates', async ({ page }) => {
    const c = categories.find((x) => posts.filter((p) => p.categoryIds.includes(x.id)).length > 12)!;
    await page.goto(`/category/${enc(c.slug)}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(c.title);
    expect(await page.locator('main section[data-listing] > article').count()).toBe(10);
    await page.getByRole('link', { name: '2', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/category/${enc(c.slug)}/page/2$`));
    expect(await page.locator('main article').count()).toBeGreaterThan(0);
    expect((await page.goto(`/category/${enc(c.slug)}/page/9999`))!.status()).toBe(404);
  });

  test('tag archive', async ({ page }) => {
    const t = tags.find((x) => posts.some((p) => p.tagIds.includes(x.id)))!;
    await page.goto(`/tag/${enc(t.slug)}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(t.title);
    expect(await page.locator('main article').count()).toBeGreaterThan(0);
  });

  test('blog pagination: page 2 differs from page 1, page 1 URL variants redirect, far page 404', async ({ page }) => {
    await page.goto('/blog');
    const first = await page.locator('main article h2').first().innerText();
    await page.goto('/blog/page/2');
    expect(await page.locator('main article h2').first().innerText()).not.toBe(first);
    await page.goto('/blog/page/1');
    await expect(page).toHaveURL(/\/blog$/);
    expect((await page.goto('/blog/page/99999'))!.status()).toBe(404);
  });

  test('static pages render (About, Disclaimer, Privacy, Terms)', async ({ page }) => {
    for (const p of pages.filter((x) => [342, 325, 315, 322].includes(x.id))) {
      const r = await page.goto(`/${enc(p.slug)}`);
      expect(r!.status(), p.slug).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(p.title);
      expect((await page.locator('.entry-content').innerText()).length).toBeGreaterThan(100);
    }
  });

  test('Marathi search finds articles; empty and no-hit queries behave', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('शोधा').first().fill('कबनूर');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/search\?q=/);
    expect(await page.locator('main article').count()).toBeGreaterThan(0);
    expect(await page.locator('meta[name="robots"]').getAttribute('content')).toContain('noindex');
    await page.goto('/search?q=' + encodeURIComponent('zzzzqqqq'));
    await expect(page.getByText('कोणताही निकाल आढळला नाही')).toBeVisible();
    await page.goto('/search');
    await expect(page.getByText('शोधण्यासाठी')).toBeVisible();
  });

  test('custom 404 page', async ({ page }) => {
    const r = await page.goto('/this/does/not/exist');
    expect(r!.status()).toBe(404);
    await expect(page.getByText('हे पृष्ठ सापडले नाही')).toBeVisible();
  });
});

test.describe('legacy URL redirects', () => {
  test('?p=ID -> 301 /blog/<slug> for published posts', async ({ request }) => {
    for (const id of [273, 2584, 78, 89]) {
      const r = await request.get(`/?p=${id}`, { maxRedirects: 0 });
      expect(r.status(), `p=${id}`).toBe(301);
      expect(decodeURIComponent(new URL(r.headers()['location']).pathname)).toBe(`/blog/${post(id).slug}`);
    }
  });
  test('?page_id=ID, ?cat=ID -> 301 to current routes', async ({ request }) => {
    const r = await request.get('/?page_id=342', { maxRedirects: 0 });
    expect(r.status()).toBe(301);
    expect(new URL(r.headers()['location']).pathname).toBe('/about-us');
    const c = categories.find((x) => x.id === 5)!;
    const r2 = await request.get('/?cat=5', { maxRedirects: 0 });
    expect(r2.status()).toBe(301);
    expect(decodeURIComponent(new URL(r2.headers()['location']).pathname)).toBe(`/category/${c.slug}`);
  });
  test('draft ids and unknown ids are 404, redirect targets resolve with 200 (no loops)', async ({ request, page }) => {
    expect((await request.get('/?p=83', { maxRedirects: 0 })).status()).toBe(404);
    expect((await request.get('/?p=99999999', { maxRedirects: 0 })).status()).toBe(404);
    const r = await page.goto('/?p=273');
    expect(r!.status()).toBe(200);
    expect(decodeURIComponent(new URL(page.url()).pathname)).toBe(`/blog/${post(273).slug}`);
  });
  test('old upload URLs redirect to the Sanity CDN', async ({ request }) => {
    const r = await request.get('/wp-content/uploads/2022/09/home-300x200.jpg', { maxRedirects: 0 });
    expect(r.status()).toBe(301);
    expect(r.headers()['location']).toMatch(/^https:\/\/cdn\.sanity\.io\/images\//);
  });
  test('/feed -> /feed.xml', async ({ request }) => {
    const r = await request.get('/feed', { maxRedirects: 0 });
    expect(r.status()).toBe(301);
    expect(new URL(r.headers()['location'], 'http://x').pathname).toBe('/feed.xml');
  });
});

test.describe('SEO endpoints & headers', () => {
  test('sitemap lists every published post and page, and no draft', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decodeURIComponent(m[1]));
    for (const p of posts) expect(locs.some((l) => l.endsWith(`/blog/${p.slug}`)), `post ${p.id}`).toBe(true);
    for (const p of pages) expect(locs.some((l) => l.endsWith(`/${p.slug}`)), `page ${p.id}`).toBe(true);
    for (const d of drafts) expect(locs.some((l) => l.endsWith(`/blog/${d.slug}`)), `draft ${d.id}`).toBe(false);
  });
  test('robots.txt', async ({ request }) => {
    const t = await (await request.get('/robots.txt')).text();
    expect(t).toMatch(/User-Agent: \*/i);
    // On a non-production build everything is disallowed; in production /studio is disallowed and the sitemap is listed.
    expect(/Disallow: \/\s*$/m.test(t) || (/Disallow: \/studio/.test(t) && /Sitemap:/.test(t))).toBe(true);
  });
  test('RSS feed is valid-looking Marathi XML', async ({ request }) => {
    const r = await request.get('/feed.xml');
    expect(r.headers()['content-type']).toContain('application/rss+xml');
    const x = await r.text();
    expect(x).toContain('<language>mr</language>');
    expect((x.match(/<item>/g) || []).length).toBe(30);
    expect(x).toMatch(/<title>[^<]*[\u0900-\u097F]/);
  });
  test('Studio is noindex and not blocked', async ({ request }) => {
    const r = await request.get('/studio');
    expect(r.status()).toBe(200);
    expect(r.headers()['x-robots-tag']).toContain('noindex');
  });
  test('security headers; no Sanity secrets in HTML', async ({ request }) => {
    const r = await request.get('/');
    expect(r.headers()['x-content-type-options']).toBe('nosniff');
    const html = await r.text();
    expect(html).not.toMatch(/SANITY_API|sk[A-Za-z0-9]{40,}/);
  });
});

test.describe('layouts', () => {
  test('desktop has no horizontal overflow and shows inline nav', async ({ page }) => {
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole('navigation', { name: 'मुख्य मेनू' }).getByRole('link', { name: 'मुख्यपृष्ठ' }).first()).toBeVisible();
  });
  test('@mobile menu toggles, article has no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('button', { name: /मेनू/ }).click();
    await expect(page.locator('#mobile-menu')).toBeVisible();
    await page.locator('#mobile-menu a').nth(1).click();
    await expect(page).toHaveURL(/\/category\//);
    await page.goto(`/blog/${enc(post(2584).slug)}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await allImagesLoaded(page)).toEqual([]);
  });
});
