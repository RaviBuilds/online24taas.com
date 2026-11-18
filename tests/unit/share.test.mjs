import test from 'node:test';
import assert from 'node:assert/strict';
import { readableUrl, shareMessage, whatsappHref } from '../../src/lib/share.ts';

const slug = '\u0928\u094D\u092F\u093E\u092F\u093E\u0932\u092F\u0940\u0928-\u0938\u0902\u092A';
const encoded = `https://www.online24taas.com/blog/${encodeURIComponent(slug)}`;
const title = '\u0928\u094D\u092F\u093E\u092F\u093E\u0932\u092F\u0940\u0928 \u0938\u0902\u092A & "\u092C\u093E\u0924\u092E\u0940"?';

test('readableUrl decodes Marathi path characters', () => {
  assert.equal(readableUrl(encoded), `https://www.online24taas.com/blog/${slug}`);
});

test('readableUrl keeps reserved characters and spaces encoded', () => {
  assert.equal(readableUrl('https://x.com/a%2Fb%3Fc%23d%26e'), 'https://x.com/a%2Fb%3Fc%23d%26e');
  assert.equal(readableUrl('https://x.com/a%20b'), 'https://x.com/a%20b');
  assert.equal(readableUrl('https://x.com/p?q=%E0%A4%85&r=1'), 'https://x.com/p?q=\u0905&r=1');
});

test('readableUrl falls back on malformed encoding and leaves ASCII untouched', () => {
  assert.equal(readableUrl('https://x.com/%E0%A4%'), 'https://x.com/%E0%A4%');
  assert.equal(readableUrl('https://x.com/blog/english-slug'), 'https://x.com/blog/english-slug');
});

test('whatsappHref encodes the message once and round-trips to the readable text', () => {
  const href = whatsappHref(title, encoded);
  const text = new URL(href).searchParams.get('text');
  assert.equal(text, shareMessage(title, encoded));
  assert.equal(text, `${title}\n\nhttps://www.online24taas.com/blog/${slug}`);
  assert.ok(!text.includes('%E0'), 'no percent-encoded Marathi in the visible message');
  assert.ok(!href.includes('%25E0'), 'no double encoding in the link');
});

test('readable URL is the same article after the browser re-encodes it', () => {
  assert.equal(new URL(readableUrl(encoded)).href, new URL(encoded).href);
});
