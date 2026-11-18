// Dev-only: screenshots the comparison page and reports which platform font Chrome actually used per candidate.
import { chromium } from '@playwright/test';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(path.join(dir, 'index.html')).href;
const browser = await chromium.launch();
for (const [name, vp] of [['desktop', { width: 1500, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: name === 'mobile' ? 2 : 1 });
  const page = await ctx.newPage();
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(dir, `compare-${name}.png`), fullPage: true });
  if (name === 'desktop') {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
    for (const cls of ['f-2006', 'f-2007', 'f-tiro', 'f-mukta']) {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: `.${cls}.size-big` });
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
      console.log(cls, JSON.stringify(fonts.map((f) => ({ family: f.familyName, custom: f.isCustomFont, glyphs: f.glyphCount }))));
    }
    const overflow = await page.evaluate(() => [...document.querySelectorAll('.cell')].filter((c) => c.scrollWidth > c.clientWidth + 1).length);
    console.log('desktop cells with horizontal overflow:', overflow);
  } else {
    console.log('mobile document scrollWidth vs viewport:', await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]));
  }
  await ctx.close();
}
await browser.close();

