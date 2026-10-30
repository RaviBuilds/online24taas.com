import fs from 'node:fs';
import { transform, flushUnmapped } from './transform-pt.mjs';
const posts = JSON.parse(fs.readFileSync('/tmp/online24taas-work/migration/intermediate/wp_posts.json', 'utf8'));
const byId = {};
for (const p of posts) byId[p.ID] = p;
const DEV = /[\u0900-\u097F]/;
let failures = 0;
function check(name, cond, detail = '') { const ok = !!cond; if (!ok) failures++; console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? ' :: ' + detail : ''}`); }
function get(id) { return byId[id] || null; }
console.log('[A] Heading + Paragraph (post 2551)');
{
  const p = get(2551); const r = transform(p ? p.post_content : '');
  const heads = r.blocks.filter((b) => b.style && b.style.startsWith('h'));
  const paras = r.blocks.filter((b) => b.style === 'normal');
  const text = JSON.stringify(r.blocks);
  check('has heading blocks', heads.length >= 1, 'heads=' + heads.length);
  check('has paragraph blocks', paras.length >= 1, 'paras=' + paras.length);
  check('Marathi preserved', DEV.test(text) && !/[\uFFFD]|Ã|â€/.test(text));
  check('sourceFormat=gutenberg', r.sourceFormat === 'gutenberg');
}
console.log('[B] List (post 78)');
{
  const p = get(78); const r = transform(p ? p.post_content : '');
  const listItems = r.blocks.filter((b) => b.listItem);
  check('has list-item blocks >=6', listItems.length >= 6, 'items=' + listItems.length);
  check('list items distinct', new Set(listItems.map((b) => b._key)).size === listItems.length);
}
console.log('[C] Inline image (post 10)');
{
  const p = get(10); const r = transform(p ? p.post_content : '');
  const imgs = r.blocks.filter((b) => b._type === 'image');
  check('has image block', imgs.length >= 1, 'imgs=' + imgs.length);
  check('image keeps wpAttachmentId', imgs.some((i) => i.wpAttachmentId != null));
  check('image has _needsAsset', imgs.every((i) => i._needsAsset === true));
}
console.log('[D] Bulk no-throw over published posts');
{
  const pub = posts.filter((p) => p.post_status === 'publish' && p.post_type === 'post');
  let threw = 0, droppedDev = 0;
  for (const p of pub) {
    try {
      const hadDev = DEV.test(p.post_content || '');
      const r = transform(p.post_content || '');
      const hasDev = DEV.test(JSON.stringify(r.blocks));
      if (hadDev && !hasDev) droppedDev++;
    } catch (e) { threw++; }
  }
  check('no transform threw', threw === 0, 'threw=' + threw);
  check('no post lost Devanagari', droppedDev === 0, 'dropped=' + droppedDev);
}
console.log('[E] Schema membership check');
{
  const pub = posts.filter((p) => p.post_status === 'publish' && p.post_type === 'post').slice(0, 30);
  let bad = 0;
  for (const p of pub) {
    const r = transform(p.post_content || '');
    for (const b of r.blocks) {
      if (!['block','image','rawHtml'].includes(b._type)) bad++;
      if (b._type === 'block' && b.listItem && b.style !== 'normal') bad++;
    }
  }
  check('all blocks schema-valid', bad === 0, 'bad=' + bad);
}
const n = flushUnmapped();
console.log(`\nunmapped/unknown block entries logged: ${n}`);
console.log(`\nRESULT: ${failures === 0 ? 'ALL TESTS PASS' : failures + ' TEST(S) FAILED'}`);
process.exit(failures === 0 ? 0 : 1);
