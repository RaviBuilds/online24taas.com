import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 2 });
await p.goto(pathToFileURL(path.join(dir,'index.html')).href); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(400);
const g = await p.$$('section:nth-of-type(1) .grid');
await p.screenshot({ path: path.join(dir,'crop-conjunct.png'), clip: { x:0, y:(await g[0].boundingBox()).y-30, width:1500, height:(await g[3].boundingBox()).y + 120 - (await g[0].boundingBox()).y }});
await b.close();
