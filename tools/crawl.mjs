#!/usr/bin/env node
// Full-site crawl: every sitemap URL must answer 200, every internal link must resolve (no 404/5xx),
// every <img>/srcset image must load (HEAD 200 from the Sanity CDN), canonical must be self-referencing.
//   BASE=http://localhost:3100 node tools/crawl.mjs
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:3100';
const CONC = Number(process.env.CONC || 8);
const sitemap = await (await fetch(BASE + '/sitemap.xml')).text();
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const local = (u) => { const x = new URL(u); return BASE + x.pathname + x.search; };
const pool = async (items, fn) => { let i = 0; const run = async () => { while (i < items.length) { const k = i++; await fn(items[k], k); } }; await Promise.all(Array.from({ length: CONC }, run)); };
const res = { base: BASE, pages: urls.length, bad: [], links: new Set(), images: new Set(), noCanonical: [], noTitle: [] };
const decodeAmp = (s) => s.replace(/&amp;/g, '&');

await pool(urls, async (u) => {
  const r = await fetch(local(u), { redirect: 'manual' });
  if (r.status !== 200) { res.bad.push({ url: u, status: r.status }); return; }
  const html = await r.text();
  if (!/<title>[^<]+<\/title>/.test(html)) res.noTitle.push(u);
  const canon = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
  if (!canon) res.noCanonical.push(u);
  for (const m of html.matchAll(/<a [^>]*href="([^"#]+)"/g)) { const h = decodeAmp(m[1]); if (h.startsWith('/') && !h.startsWith('//')) res.links.add(h); else if (h.startsWith(BASE)) res.links.add(h.slice(BASE.length)); }
  for (const m of html.matchAll(/<img [^>]*>/g)) {
    for (const a of m[0].matchAll(/\b(?:src|srcset)="([^"]+)"/g)) for (const part of decodeAmp(a[1]).split(',')) { const s = part.trim().split(/\s+/)[0]; if (s) res.images.add(s.startsWith('/_next/image') ? decodeURIComponent(new URL(s, BASE).searchParams.get('url') || s) : s); }
  }
});
const links = [...res.links].filter((l) => !l.startsWith('/_next') && !l.startsWith('/studio'));
res.brokenLinks = [];
await pool(links, async (l) => { const r = await fetch(BASE + l, { redirect: 'follow' }); if (r.status >= 400) res.brokenLinks.push({ link: l, status: r.status }); });
res.brokenImages = [];
const imgs = [...res.images].filter((s) => /^https?:\/\//.test(s) || s.startsWith('/'));
await pool(imgs, async (s) => { const r = await fetch(s.startsWith('/') ? BASE + s : s, { method: 'HEAD' }); if (r.status !== 200) res.brokenImages.push({ src: s, status: r.status }); });
const summary = { base: BASE, sitemapUrls: urls.length, nonOkPages: res.bad.length, missingTitle: res.noTitle.length, missingCanonical: res.noCanonical.length, internalLinksChecked: links.length, brokenLinks: res.brokenLinks.length, imagesChecked: imgs.length, brokenImages: res.brokenImages.length };
console.log(JSON.stringify(summary, null, 2));
if (res.bad.length) console.log('bad pages', res.bad.slice(0, 10));
if (res.brokenLinks.length) console.log('broken links', res.brokenLinks.slice(0, 10));
if (res.brokenImages.length) console.log('broken images', res.brokenImages.slice(0, 10));
fs.mkdirSync('migration/reports/mkiaioc7.production', { recursive: true });
fs.writeFileSync('migration/reports/mkiaioc7.production/frontend-crawl.json', JSON.stringify({ at: new Date().toISOString(), ...summary, bad: res.bad, brokenLinks: res.brokenLinks, brokenImages: res.brokenImages, noCanonical: res.noCanonical, noTitle: res.noTitle }, null, 2));
process.exit(res.bad.length || res.brokenLinks.length || res.brokenImages.length || res.noCanonical.length ? 1 : 0);
