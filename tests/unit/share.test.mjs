import test from 'node:test';
import assert from 'node:assert/strict';
import { facebookHref, shareMessage, telegramHref, whatsappHref, xHref } from '../../src/lib/share.ts';
import { normalizeOrigin } from '../../src/lib/site.ts';

const slug = '\u0928\u094D\u092F\u093E\u092F\u093E\u0932\u092F\u0940\u0928-\u0938\u0902\u092A';
const url = `https://www.online24taas.com/blog/${encodeURIComponent(slug)}`;
const title = '\u0928\u094D\u092F\u093E\u092F\u093E\u0932\u092F\u0940\u0928 \u0938\u0902\u092A & "\u092C\u093E\u0924\u092E\u0940"?';

test('share message is title, blank line, canonical ASCII URL', () => {
  assert.equal(shareMessage(title, url), `${title}\n\n${url}`);
  assert.match(url, /^[\x21-\x7e]+$/, 'canonical URL is pure ASCII');
});

test('whatsappHref encodes the message exactly once and the URL appears once', () => {
  const href = whatsappHref(title, url);
  const text = new URL(href).searchParams.get('text');
  assert.equal(text, `${title}\n\n${url}`);
  assert.equal(text.split(url).length - 1, 1);
  assert.equal(decodeURIComponent(new URL(href).search.slice(6)), shareMessage(title, url), 'one decode returns the message');
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