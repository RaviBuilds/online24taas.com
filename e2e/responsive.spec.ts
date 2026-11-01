// Layout / readability / interaction matrix across phone, tablet and desktop viewports.
// Runs against whatever E2E_BASE_URL points to (local production build or the Vercel preview; set E2E_BYPASS for a
// protected preview). The "@cross" tests also run in Firefox. Screenshots go to test-results/matrix/.
import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { categories, enc, pages, post } from './fixtures';

// `full`: every page type; otherwise only the core pages (keeps the run feasible on a small CI machine).
// `cross`: also runs in Firefox. `interact`: menu/search/pagination/footer test; `forms`: contact-form feedback test.
const VIEWPORTS = [
  { name: 'phone-320', width: 320, height: 568, full: false, cross: false, interact: true, forms: false },
  { name: 'phone-375', width: 375, height: 667, full: true, cross: true, interact: true, forms: true },
  { name: 'phone-412', width: 412, height: 915, full: false, cross: false, interact: false, forms: false },
  { name: 'tablet-768', width: 768, height: 1024, full: true, cross: false, interact: true, forms: false },
  { name: 'laptop-1024', width: 1024, height: 768, full: false, cross: false, interact: true, forms: false },
  { name: 'desktop-1280', width: 1280, height: 800, full: true, cross: true, interact: true, forms: true },
  { name: 'wide-1920', width: 1920, height: 1080, full: false, cross: false, interact: false, forms: false },
];
const CORE = new Set(['home', 'article-many-images', 'category', 'not-found']);

const PAGES: { name: string; path: () => string }[] = [
  { name: 'home', path: () => '/' },
  { name: 'article-many-images', path: () => `/blog/${enc(post(929).slug)}` },
  { name: 'article-captions', path: () => `/blog/${enc(post(580).slug)}` },
  { name: 'article-embeds', path: () => `/blog/${enc(post(675).slug)}` },
  { name: 'article-image-led', path: () => `/blog/${enc(post(89).slug)}` },
  { name: 'category', path: () => `/category/${enc(categories.find((c) => c.id === 13)!.slug)}` },
  { name: 'static-page', path: () => `/${enc(pages.find((p) => p.id === 342)!.slug)}` },
  { name: 'blog-page-2', path: () => '/blog/page/2' },
  { name: 'search-results', path: () => `/search?q=${encodeURIComponent('स्वामी')}` },
  { name: 'not-found', path: () => '/no/such/page' },
];

fs.mkdirSync('test-results/matrix', { recursive: true });

async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => undefined);
  // Scroll through the page like a reader would; at each step wait (max 5 s) for the images now in view to finish loading.
  await page.evaluate(async () => {
    const step = Math.max(300, window.innerHeight - 100);
    const inView = () => Array.from(document.images).filter((i) => { const r = i.getBoundingClientRect(); return r.bottom > -200 && r.top < window.innerHeight + 200; });
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: 'instant' });
      const t0 = Date.now();
      while (Date.now() - t0 < 5000 && inView().some((i) => !i.complete)) await new Promise((r) => setTimeout(r, 100));
      await new Promise((r) => setTimeout(r, 100));
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.waitForLoadState('networkidle').catch(() => undefined);
}

/** Finds elements whose box pokes out of the viewport and is not inside an intentional scroll/clip container. */
async function overflowReport(page: Page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const bad: string[] = [];
    const clipped = (el: Element) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const s = getComputedStyle(p);
        if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) return true;
      }
      return false;
    };
    for (const el of Array.from(document.body.querySelectorAll('*'))) {
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || s.position === 'fixed') continue;
      if (el.closest('.sr-only, [hidden], [aria-hidden="true"]') && s.position === 'absolute') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if ((r.right > vw + 1 || r.left < -1) && !clipped(el)) bad.push(`${el.tagName.toLowerCase()}.${(el.getAttribute('class') || '').slice(0, 40)} [${Math.round(r.left)},${Math.round(r.right)}] vw=${vw}`);
    }
    return bad.slice(0, 8);
  });
}

for (const vp of VIEWPORTS) {
  test.describe(`matrix ${vp.name}${vp.cross ? ' @cross' : ''}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });
    test.describe.configure({ timeout: 240_000 }); // long image-heavy articles on a slow CI machine

    for (const pg of PAGES.filter((x) => vp.full || CORE.has(x.name))) {
      test(`${pg.name}: no overflow/clipping, images load and keep proportions, Marathi text readable`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text()) && errors.push(m.text()));
        const res = await page.goto(pg.path());
        expect(res!.status()).toBe(pg.name === 'not-found' ? 404 : 200);
        await settle(page);

        // 1. nothing wider than the viewport
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 'document horizontal overflow').toBeLessThanOrEqual(0);
        expect(await overflowReport(page), 'elements outside the viewport').toEqual([]);

        // 2. images: loaded, inside the viewport, not distorted
        const imgs = await page.evaluate(() =>
          Array.from(document.images)
            .filter((i) => i.getBoundingClientRect().width > 0)
            .map((i) => {
              const r = i.getBoundingClientRect();
              const fit = getComputedStyle(i).objectFit;
              const ratioN = i.naturalWidth / (i.naturalHeight || 1);
              const ratioR = r.width / (r.height || 1);
              return { src: i.currentSrc.slice(-60), ok: i.complete && i.naturalWidth > 0, w: r.width, vw: document.documentElement.clientWidth, distorted: fit === 'fill' && Math.abs(ratioN - ratioR) / ratioN > 0.03 };
            }),
        );
        expect(imgs.filter((i) => !i.ok), 'images that failed to load').toEqual([]);
        expect(imgs.filter((i) => i.w > i.vw + 1), 'images wider than the viewport').toEqual([]);
        expect(imgs.filter((i) => i.distorted), 'distorted images').toEqual([]);

        // 3. text: headings do not clip, line-height is generous enough for Devanagari matras
        const text = await page.evaluate(() => {
          const out = { clipped: [] as string[], tight: [] as string[] };
          for (const el of Array.from(document.querySelectorAll('h1, h2, h3, article p, .entry-content li, nav a'))) {
            const r = el.getBoundingClientRect();
            if (r.width <= 1 || el.closest('.sr-only')) continue; // visually hidden text is exempt
            const s = getComputedStyle(el);
            if (el.scrollWidth > el.clientWidth + 1 && s.display !== 'inline' && !/(auto|scroll)/.test(s.overflowX)) out.clipped.push(`${el.tagName} ${(el.textContent || '').slice(0, 30)}`);
            const lh = parseFloat(s.lineHeight) / parseFloat(s.fontSize);
            if (Number.isFinite(lh) && lh < 1.3 && (el.textContent || '').length > 3) out.tight.push(`${el.tagName} lh=${lh.toFixed(2)}`);
          }
          return out;
        });
        expect(text.clipped.slice(0, 5), 'clipped text').toEqual([]);
        expect(text.tight.slice(0, 5), 'line-height below 1.3').toEqual([]);

        // 4. basic accessibility
        expect(await page.locator('html').getAttribute('lang')).toBe('mr');
        expect(await page.locator('h1').count(), 'exactly one h1').toBe(1);
        expect(await page.locator('main').count()).toBe(1);
        expect(await page.locator('img:not([alt])').count(), 'img without alt attribute').toBe(0);
        expect(errors, 'console/page errors').toEqual([]);

        if (['home', 'article-many-images', 'category'].includes(pg.name)) await page.screenshot({ path: `test-results/matrix/${vp.name}-${pg.name}.png`, fullPage: true });
      });
    }

    if (vp.interact) test('navigation: menu, search, pagination, footer', async ({ page }) => {
      await page.goto('/');
      await settle(page);
      const mobile = vp.width < 1024;
      const nav = page.getByRole('navigation', { name: 'मुख्य मेनू' });
      if (mobile) {
        const toggle = page.getByRole('button', { name: 'मेनू उघडा' });
        const box = (await toggle.boundingBox())!;
        expect(box.width, 'tap target width').toBeGreaterThanOrEqual(40);
        expect(box.height, 'tap target height').toBeGreaterThanOrEqual(40);
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(page.locator('#primary-menu')).toBeHidden();
        await toggle.click();
        await expect(page.getByRole('button', { name: 'मेनू बंद करा' })).toHaveAttribute('aria-expanded', 'true');
        await expect(page.locator('#primary-menu')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.locator('#primary-menu')).toBeHidden();
        await page.getByRole('button', { name: 'मेनू उघडा' }).click();
        await page.locator('#primary-menu a').nth(1).click();
        await expect(page).toHaveURL(/\/category\//);
        await expect(page.locator('#primary-menu')).toBeHidden(); // closed after navigation
      } else {
        await expect(nav.getByRole('link', { name: 'मुख्यपृष्ठ' })).toBeVisible();
        expect(await nav.getByRole('link').count()).toBeGreaterThanOrEqual(9);
        await expect(page.getByRole('button', { name: 'मेनू उघडा' })).toBeHidden();
      }

      // search: open, type Marathi, Enter
      await page.goto('/');
      await page.getByRole('button', { name: 'शोधा', exact: true }).first().click();
      const box = page.getByRole('searchbox', { name: 'शोधा' });
      await expect(box).toBeFocused();
      await box.fill('स्वामी');
      await box.press('Enter');
      await expect(page).toHaveURL(/\/search\?q=/);
      expect(await page.locator('main article').count()).toBeGreaterThan(0);

      // pagination from the home page
      await page.goto('/');
      const pager = page.getByRole('navigation', { name: 'पृष्ठे' });
      await expect(pager.locator('[aria-current="page"]')).toHaveText('1');
      await pager.getByRole('link', { name: '2', exact: true }).click();
      await expect(page).toHaveURL(/\/blog\/page\/2$/);
      await expect(page.getByRole('navigation', { name: 'पृष्ठे' }).locator('[aria-current="page"]')).toHaveText('2');
      await page.getByRole('navigation', { name: 'पृष्ठे' }).getByRole('link', { name: /मागील/ }).click();
      await expect(page).toHaveURL(/\/blog$/);

      // footer: four widget areas, visible and not clipped; scroll-to-top appears
      await page.goto('/');
      await page.locator('footer').scrollIntoViewIfNeeded();
      await expect(page.locator('footer')).toBeVisible();
      for (const h of ['Trending Stories', 'Trending Topics', 'Footer Menu', 'संपर्क']) await expect(page.locator('footer').getByRole('heading', { name: h })).toBeVisible();
      await expect(page.getByRole('button', { name: 'वर जा' })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    });

    if (vp.forms) test('contact form: accessible success, field errors, rate-limit and outage messages', async ({ page }) => {
      await page.goto('/');
      const form = page.getByRole('form', { name: 'संपर्क फॉर्म' });
      await form.scrollIntoViewIfNeeded();
      for (const label of ['तुमचे नाव *', 'ईमेल *', 'विषय *', 'संदेश (ऐच्छिक)']) await expect(form.getByLabel(label)).toBeVisible();
      const fill = async () => {
        await form.getByLabel('तुमचे नाव *').fill('रवी');
        await form.getByLabel('ईमेल *').fill('reader@example.com');
        await form.getByLabel('विषय *').fill('चाचणी');
      };
      const mock = (status: number, body: object) => page.route('**/api/contact', (r) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }));

      await mock(200, { ok: true });
      await fill();
      await form.getByRole('button', { name: 'पाठवा' }).click();
      await expect(form.getByRole('status')).toContainText('धन्यवाद');
      await expect(form.getByLabel('तुमचे नाव *')).toHaveValue('');

      await page.unroute('**/api/contact');
      await mock(422, { error: 'कृपया चिन्हांकित माहिती तपासा.', fields: { email: 'कृपया योग्य ईमेल पत्ता लिहा.' } });
      await fill();
      await form.getByRole('button', { name: 'पाठवा' }).click();
      await expect(form.getByRole('alert')).toContainText('तपासा');
      await expect(form.getByLabel('ईमेल *')).toHaveAttribute('aria-invalid', 'true');
      await expect(form.getByLabel('ईमेल *')).toBeFocused();
      await expect(form.getByText('कृपया योग्य ईमेल पत्ता लिहा.')).toBeVisible();

      for (const status of [429, 503, 502]) {
        await page.unroute('**/api/contact');
        await mock(status, { error: `त्रुटी ${status}` });
        await form.getByRole('button', { name: 'पाठवा' }).click();
        await expect(form.getByRole('alert')).toContainText(`त्रुटी ${status}`);
      }
      // network failure
      await page.unroute('**/api/contact');
      await page.route('**/api/contact', (r) => r.abort());
      await form.getByRole('button', { name: 'पाठवा' }).click();
      await expect(form.getByRole('alert')).toContainText('इंटरनेट');
    });
  });
}
