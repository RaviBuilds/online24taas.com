import test from 'node:test';
import assert from 'node:assert/strict';
import { facebookHref, readableUrl, shareMessage, telegramHref, whatsappHref, xHref } from '../../src/lib/share.ts';
import { normalizeOrigin } from '../../src/lib/site.ts';

const slug = '\u0928\u094D\u092F\u093E\u092F\u093E\u0932\u092F\u0940\u0928-\u0938\u0902\u092A';
const url = `https://www.online24taas.com/blog/${encodeURIComponent(slug)}`;
const title = '\u0928\u094D\u092F\u093E\u092F\u093E\u0932\u092F\u0940\u0928 \u0938\u0902\u092A & "\u092C\u093E\u0924\u092E\u0940"?';

test('readableUrl decodes Marathi path characters', () => {
  assert.equal(readableUrl(url), `https://www.online24taas.com/blog/${slug}`);
});

test('readableUrl keeps reserved characters and spaces encoded', () => {
  assert.equal(readableUrl('https://x.com/a%2Fb%3Fc%23d%26e'), 'https://x.com/a%2Fb%3Fc%23d%26e');
  assert.equal(readableUrl('https://x.com/a%20b'), 'https://x.com/a%20b');
});

test('readableUrl falls back on malformed encoding and leaves ASCII untouched', () => {
  assert.equal(readableUrl('https://x.com/%E0%A4%'), 'https://x.com/%E0%A4%');
  assert.equal(readableUrl('https://x.com/blog/english-slug'), 'https://x.com/blog/english-slug');
});

test('whatsappHref carries the Marathi title and readable slug URL, encoded once', () => {
  const href = whatsappHref(title, url);
  const text = new URL(href).searchParams.get('text');
  assert.equal(text, `${title}\n\nhttps://www.online24taas.com/blog/${slug}`);
  assert.ok(!text.includes('%E0'), 'no percent-encoded Marathi in the visible message');
  assert.ok(!href.includes('%25E0'), 'no double encoding');
  assert.equal(text, shareMessage(title, url));
});

test('readable URL is the same article after the browser re-encodes it', () => {
  assert.equal(new URL(readableUrl(url)).href, new URL(url).href);
});
test('facebook, X and telegram pass the canonical URL (and title) intact', () => {
  assert.equal(new URL(facebookHref(url)).searchParams.get('u'), url);
  const x = new URL(xHref(title, url));
  assert.equal(x.searchParams.get('url'), url);
  assert.equal(x.searchParams.get('text'), title);
  const t = new URL(telegramHref(title, url));
  assert.equal(t.searchParams.get('url'), url);
  assert.equal(t.searchParams.get('text'), title);
});

test('normalizeOrigin accepts real public origins and strips path/slash', () => {
  assert.equal(normalizeOrigin('https://www.online24taas.com/'), 'https://www.online24taas.com');
  assert.equal(normalizeOrigin('www.online24taas.com'), 'https://www.online24taas.com');
});

test('normalizeOrigin rejects hostless, localhost and empty values', () => {
  assert.equal(normalizeOrigin('https://www.online24taas'), undefined);
  assert.equal(normalizeOrigin('http://localhost:3100'), undefined);
  assert.equal(normalizeOrigin('http://127.0.0.1:3000'), undefined);
  assert.equal(normalizeOrigin(''), undefined);
  assert.equal(normalizeOrigin(undefined), undefined);
});