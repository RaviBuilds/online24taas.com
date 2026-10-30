import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeSlug, assignUniqueSlugs, slugifyFallback } from '../../migration/lib/slug.mjs';

test('decodes percent-encoded Marathi exactly once', () => {
  assert.equal(decodeSlug('%e0%a4%ae%e0%a4%b0%e0%a4%be%e0%a4%a0%e0%a5%80'), 'मराठी');
  assert.equal(decodeSlug('plain-ascii'), 'plain-ascii');
  // a literal "%25" decodes to "%" and must NOT be decoded a second time
  assert.equal(decodeSlug('100%25-done'), '100%-done');
});

test('tolerates a slug truncated in the middle of an escape sequence', () => {
  const truncated = '%e0%a4%ae%e0%a4%b0%e0%a4'; // म, र, then half of the next character
  assert.equal(decodeSlug(truncated), 'मर');
});

test('NFC normalisation', () => {
  assert.equal(decodeSlug('e%CC%81'), '\u00e9');
});

test('collisions get -<id>; lowest id keeps the clean slug; deterministic', () => {
  const recs = [
    { id: 30, title: 'x', sourceSlug: 'same' },
    { id: 10, title: 'x', sourceSlug: 'same' },
    { id: 20, title: 'x', sourceSlug: 'same' },
  ];
  const a = assignUniqueSlugs(recs);
  assert.equal(a.get(10).slug, 'same');
  assert.equal(a.get(20).slug, 'same-20');
  assert.equal(a.get(30).slug, 'same-30');
  assert.deepEqual([...assignUniqueSlugs([...recs].reverse())], [...a]);
});

test('WordPress-truncated (200 char) slugs are rebuilt from the title at a word boundary', () => {
  const longSlug = '%e0%a4%ae'.repeat(22) + '%e0%a4';
  assert.ok(longSlug.length >= 190);
  const s = assignUniqueSlugs([{ id: 1, title: 'गोड विषासारखी टाळाटाळ करण्याची सवय', sourceSlug: longSlug }]).get(1).slug;
  assert.equal(s, 'गोड-विषासारखी-टाळाटाळ-करण्याची-सवय');
});

test('slugifyFallback keeps matras and never cuts mid-word', () => {
  assert.equal(slugifyFallback('श्री स्वामी समर्थ!', 1), 'श्री-स्वामी-समर्थ');
  const s = slugifyFallback('एक दोन तीन चार पाच सहा सात आठ नऊ दहा अकरा बारा तेरा चौदा पंधरा सोळा सतरा', 1, 30);
  assert.ok(s.length <= 30 && !s.endsWith('-'));
  const words = new Set('एक दोन तीन चार पाच सहा सात आठ नऊ दहा अकरा बारा तेरा चौदा पंधरा सोळा सतरा'.split(' '));
  assert.ok(s.split('-').every((w) => words.has(w)), 'every segment is a whole word: ' + s);
  assert.equal(slugifyFallback('!!!', 77), '77');
});
