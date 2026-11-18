// Dev-only: against a running `next start`, report fonts Chrome actually used, font requests, overflow and lang.
import { chromium } from '@playwright/test';
const base = process.env.BASE || 'http://localhost:3100';
const b = await chromium.launch();
for (const [name, vp] of [['desktop', { width: 1366, height: 800 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = await b.newContext({ viewport: vp });
  const page = await ctx.newPage();
  const reqs = [];
  page.on('response', (r) => { if (/\.woff2?(\?|$)/.test(r.url())) reqs.push(r.url().split('/').pop()); });
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  const link = await page.$$eval('a[href^="/blog/"]', (a) => a.map((x) => x.getAttribute('href')).find((h) => h && h.split('/').length === 3));
  const pages = ['/', link].filter(Boolean);
  for (const p of pages) {
    await page.goto(base + p, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
    const out = {};
    for (const sel of ['h1, h2', 'main p, main a']) {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
      if (!nodeId) continue;
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
      out[sel] = fonts.map((f) => `${f.familyName}${f.isCustomFont ? '(web)' : '(SYSTEM)'}:${f.glyphCount}`);
    }
    const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, lang: document.documentElement.lang, ls: getComputedStyle(document.body).letterSpacing }));
    console.log(name, p, JSON.stringify(out), JSON.stringify(m));
  }
  console.log(name, 'font files fetched:', [...new Set(reqs)]);
  await ctx.close();
}
await b.close();
