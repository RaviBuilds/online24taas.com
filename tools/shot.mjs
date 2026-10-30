import { chromium } from '@playwright/test';
const pages = JSON.parse(process.argv[2]);
const browser = await chromium.launch({ channel: 'chrome' });
for (const [name, url, w] of pages) {
  const ctx = await browser.newContext({ viewport: { width: w || 1280, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  page.on('pageerror', (e) => errs.push(String(e)));
  const res = await page.goto(url, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `/tmp/shot-${name}.png`, fullPage: false });
  console.log(name, res.status(), 'errors:', errs.length, errs.slice(0, 2));
  await ctx.close();
}
await browser.close();
