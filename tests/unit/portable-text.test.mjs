import test from 'node:test';
import assert from 'node:assert/strict';
import { htmlToPortableText, htmlToComparablePlain, ptToComparablePlain } from '../../migration/lib/portable-text.mjs';
import { buildContext } from '../../migration/lib/context.mjs';
import { haveWork, norm } from './helpers.mjs';

const ctx = {
  resolveImage: ({ attachmentId, src }) => (attachmentId ? { attachmentId } : /uploads\/2022\/09\/home/.test(src) ? { attachmentId: 13 } : null),
  rewriteHref: (h) => h.replace('http://www.online24taas.com/?p=89', '/blog/post-89'),
};
const run = (html) => htmlToPortableText(html, ctx);

test('paragraph with Marathi text, bold and hard break', () => {
  const { blocks } = run('<!-- wp:paragraph -->\n<p><strong>सांगली-(ऑनलाईन24 तास टीम)</strong><br>महाराष्ट्राचे पहिले</p>\n<!-- /wp:paragraph -->');
  assert.equal(blocks.length, 1);
  const b = blocks[0];
  assert.equal(b.style, 'normal');
  assert.deepEqual(b.children.map((c) => [c.text, c.marks]), [['सांगली-(ऑनलाईन24 तास टीम)', ['strong']], ['\nमहाराष्ट्राचे पहिले', []]]);
});

test('headings keep their level', () => {
  const { blocks } = run('<h2 class="x">शीर्षक</h2><h3>उप</h3>');
  assert.deepEqual(blocks.map((b) => [b.style, b.children[0].text]), [['h2', 'शीर्षक'], ['h3', 'उप']]);
});

test('lists: bullets, numbers and nesting become distinct list-item blocks with levels', () => {
  const { blocks } = run('<ul><li>एक<ul><li>दोन</li></ul></li><li>तीन</li></ul><ol><li>अ</li><li>ब</li></ol>');
  assert.deepEqual(blocks.map((b) => [b.listItem, b.level, b.children[0].text]), [['bullet', 1, 'एक'], ['bullet', 2, 'दोन'], ['bullet', 1, 'तीन'], ['number', 1, 'अ'], ['number', 1, 'ब']]);
});

test('links become annotations (not lost), internal ?p= links are rewritten', () => {
  const { blocks } = run('<p>पहा <a href="http://www.online24taas.com/?p=89" target="_blank">हा लेख</a> आणि <a href="https://example.org/x">बाह्य</a></p>');
  const b = blocks[0];
  assert.equal(b.markDefs.length, 2);
  assert.deepEqual(b.markDefs.map((m) => [m._type, m.href]), [['link', '/blog/post-89'], ['link', 'https://example.org/x']]);
  const linked = b.children.filter((c) => c.marks.length).map((c) => [c.text, b.markDefs.find((m) => m._key === c.marks[0]).href]);
  assert.deepEqual(linked, [['हा लेख', '/blog/post-89'], ['बाह्य', 'https://example.org/x']]);
});

test('nested marks are real marks, never markdown characters', () => {
  const { blocks } = run('<p><strong><em><u>तीनही</u></em></strong> आणि <em>फक्त</em></p>');
  const b = blocks[0];
  assert.deepEqual(b.children[0].marks.sort(), ['em', 'strong', 'underline']);
  assert.ok(!b.children.some((c) => /[*_]/.test(c.text)));
});

test('WordPress colour <mark> becomes a textColor annotation', () => {
  const { blocks, diagnostics } = run('<p><mark style="background-color:rgba(0, 0, 0, 0)" class="has-inline-color has-vivid-red-color">लाल</mark></p>');
  assert.equal(blocks[0].markDefs[0]._type, 'textColor');
  assert.equal(blocks[0].markDefs[0].color, 'vivid-red');
  assert.equal(diagnostics.colorMarks, 1);
});

test('centered paragraph keeps its alignment as the center style', () => {
  assert.equal(run('<p class="has-text-align-center">मध्य</p>').blocks[0].style, 'center');
});

test('images: wp-image id wins, src fallback resolves, caption kept, empty placeholder reported', () => {
  const { blocks, diagnostics } = run(`
    <figure class="wp-block-image"><img src="http://x/a.jpg" alt="अल्ट" class="wp-image-80"/><figcaption>मथळा</figcaption></figure>
    <figure class="wp-block-image"><img src="http://www.online24taas.com/wp-content/uploads/2022/09/home-300x200.jpg" alt=""/></figure>
    <figure class="wp-block-image"><img alt=""/></figure>
    <figure class="wp-block-image"><img src="http://elsewhere/zzz.jpg" alt=""/></figure>`);
  assert.deepEqual(blocks.map((b) => [b._type, b.wpAttachmentId ?? null, b.alt, b.caption]), [['image', 80, 'अल्ट', 'मथळा'], ['image', 13, '', ''], ['image', null, '', '']]);
  assert.equal(blocks[2].sourceUrl, 'http://elsewhere/zzz.jpg');
  assert.equal(diagnostics.emptyImagePlaceholders, 1);
  assert.equal(diagnostics.unresolvedImages.length, 1);
});

test('gallery: every nested image survives', () => {
  const { blocks } = run('<figure class="wp-block-gallery"><figure class="wp-block-image"><img src="a" class="wp-image-1"/></figure><figure class="wp-block-image"><img src="b" class="wp-image-2"/></figure></figure>');
  assert.deepEqual(blocks.map((b) => b.wpAttachmentId), [1, 2]);
});

test('unsupported markup is preserved as rawHtml and reported, not dropped', () => {
  const { blocks, diagnostics } = run('<p>पहिले</p><!-- wp:html --><iframe src="//ws-in.amazon-adsystem.com/x" style="width:120px"></iframe><!-- /wp:html --><p>शेवट</p>');
  assert.deepEqual(blocks.map((b) => b._type), ['block', 'rawHtml', 'block']);
  assert.match(blocks[1].html, /<iframe[^>]+amazon-adsystem/);
  assert.equal(diagnostics.rawHtmlBlocks[0].tag, 'iframe');
});

test('scripts are preserved only as inert rawHtml for review (sanitised at render)', () => {
  const { blocks } = run('<script>alert(1)</script>');
  assert.equal(blocks[0]._type, 'rawHtml');
});

test('output is deterministic and keys are unique', () => {
  const html = '<p>एक <a href="/x">दुवा</a></p><ul><li>अ</li></ul><figure><img src="a" class="wp-image-1"/></figure>';
  assert.deepEqual(run(html), run(html));
  const keys = [];
  for (const b of run(html).blocks) { keys.push(b._key); (b.children || []).forEach((c) => keys.push(c._key)); (b.markDefs || []).forEach((m) => keys.push(m._key)); }
  assert.equal(new Set(keys).size, keys.length);
});

test('empty input gives no blocks', () => {
  assert.deepEqual(run('').blocks, []);
  assert.deepEqual(run('<!-- wp:paragraph --><p></p><!-- /wp:paragraph -->').blocks, []);
});

test('REAL DATA: text of every published post/page/draft survives the transform exactly', { skip: !haveWork }, () => {
  const real = buildContext();
  let checked = 0;
  const bad = [];
  for (const r of [...norm('posts'), ...norm('pages'), ...norm('drafts')]) {
    if (!r.content.trim()) continue;
    const { blocks } = htmlToPortableText(r.content, real);
    checked++;
    if (htmlToComparablePlain(r.content) !== ptToComparablePlain(blocks)) bad.push(r.id);
  }
  assert.ok(checked >= 230, `only ${checked} contents checked`);
  assert.deepEqual(bad, []);
});

test('REAL DATA: no unresolved images; the only raw HTML is the Amazon ad iframes', { skip: !haveWork }, () => {
  const real = buildContext();
  let imgs = 0;
  const raws = [];
  for (const r of [...norm('posts'), ...norm('pages'), ...norm('drafts')]) {
    const { blocks, diagnostics } = htmlToPortableText(r.content, real);
    assert.equal(diagnostics.unresolvedImages.length, 0, `post ${r.id}`);
    imgs += blocks.filter((b) => b._type === 'image').length;
    raws.push(...diagnostics.rawHtmlBlocks.map((x) => [r.id, x.tag]));
  }
  assert.ok(imgs > 250, 'image blocks found: ' + imgs);
  assert.ok(raws.length > 0 && raws.every(([id, tag]) => id === 675 && tag === 'iframe'), JSON.stringify(raws));
});

test('REAL DATA: known post 2584 has headings, bullets and numbered items', { skip: !haveWork }, () => {
  const p = norm('posts').find((x) => x.id === 2584);
  const { blocks } = htmlToPortableText(p.content, buildContext());
  assert.ok(blocks.some((b) => b.style === 'h2' || b.style === 'h3'));
  assert.ok(blocks.some((b) => b.listItem === 'bullet'));
  assert.ok(blocks.some((b) => b.listItem === 'number'));
  assert.ok(blocks.filter((b) => b.listItem).length >= 7);
});
