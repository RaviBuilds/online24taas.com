import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLegacy } from '../../src/lib/legacy.ts';
import { toMatchQuery } from '../../src/lib/search.ts';
import { postPath, categoryPath, tagPath, decodeParam, blogPath, searchPath } from '../../src/lib/urls.ts';
import { slugify } from '../../src/sanity/lib/slugify.ts';

const L = (url) => { const u = new URL(url, 'https://x.test'); return resolveLegacy(u.pathname, u.searchParams); };

test('legacy: /?p=ID is resolved by id (query string, which next.config redirects cannot do)', () => {
  assert.deepEqual(L('/?p=273'), { type: 'rewrite', params: { kind: 'post', id: '273' } });
  assert.deepEqual(L('/?page_id=315'), { type: 'rewrite', params: { kind: 'post', id: '315' } });
});
test('legacy: cat, tag, s, author', () => {
  assert.deepEqual(L('/?cat=5'), { type: 'rewrite', params: { kind: 'category', id: '5' } });
  assert.deepEqual(L('/?tag=foo'), { type: 'rewrite', params: { kind: 'tag', slug: 'foo' } });
  assert.deepEqual(L('/?s=%E0%A4%AE%E0%A4%B0%E0%A4%BE%E0%A4%A0%E0%A5%80'), { type: 'rewrite', params: { kind: 'search', q: 'मराठी' } });
  assert.deepEqual(L('/?author=1'), { type: 'rewrite', params: { kind: 'author' } });
});
test('legacy: plain home, unrelated queries and new routes are untouched (no redirect loops)', () => {
  for (const u of ['/', '/?utm_source=x', '/blog/abc', '/category/x?p=1', '/search?q=a']) assert.equal(L(u), null, u);
});
test('legacy: feeds redirect to /feed.xml, uploads go to the media resolver', () => {
  assert.deepEqual(L('/feed/'), { type: 'redirect', to: '/feed.xml' });
  assert.deepEqual(L('/?feed=rss2'), { type: 'redirect', to: '/feed.xml' });
  assert.deepEqual(L('/wp-content/uploads/2024/10/a-300x200.jpg'), { type: 'rewrite', params: { kind: 'media', path: '2024/10/a-300x200.jpg' } });
});

test('search query building: prefix terms, operators neutralised, Devanagari kept', () => {
  assert.equal(toMatchQuery('कोल्हापूर पाणी'), 'कोल्हापूर* पाणी*');
  assert.equal(toMatchQuery('a" || _id match "*'), 'a* _id* match*'); // quotes/pipes/stars stripped; value is a bound GROQ param anyway
  assert.equal(toMatchQuery('   '), '');
  assert.ok(toMatchQuery('x '.repeat(50)).split(' ').length <= 8);
});

test('urls: Marathi slugs are percent-encoded in hrefs and decode back', () => {
  const p = postPath('श्री-स्वामी-समर्थ');
  assert.match(p, /^\/blog\/%E0%A4%B6/);
  assert.equal(decodeParam(p.split('/')[2]), 'श्री-स्वामी-समर्थ');
  assert.equal(decodeParam('%E0%A4'), '%E0%A4', 'malformed escapes must not throw');
  assert.equal(categoryPath('abc', 3), '/category/abc/page/3');
  assert.equal(tagPath('abc'), '/tag/abc');
  assert.equal(blogPath(1), '/blog');
  assert.equal(blogPath(2), '/blog/page/2');
  assert.equal(searchPath('मराठी', 2), '/search?q=%E0%A4%AE%E0%A4%B0%E0%A4%BE%E0%A4%A0%E0%A5%80&page=2');
});

test('Studio slugify keeps Devanagari (default Sanity slugify would erase it)', () => {
  assert.equal(slugify('श्री स्वामी समर्थ!'), 'श्री-स्वामी-समर्थ');
  assert.equal(slugify('Hello, World 2024'), 'hello-world-2024');
  assert.ok(slugify('अ '.repeat(100), 20).length <= 20);
});
