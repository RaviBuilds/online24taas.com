import test from 'node:test';
import assert from 'node:assert/strict';
import { haveWork, norm, raw } from './helpers.mjs';

const skip = !haveWork;

test('authoritative source counts', { skip }, () => {
  const r = norm('reconciliation');
  assert.equal(r.wpPostsRows, 2308);
  assert.equal(r.publishedPosts, 660);
  assert.equal(r.publishedPages, 5);
  assert.equal(r.buckets['post:draft'], 20);
  assert.equal(r.attachments, 799);
  assert.equal(r.revisions, 806);
  assert.equal(r.categories, 14);
  assert.equal(r.tags, 89);
  assert.equal(r.authors, 1);
  assert.equal(r.comments.total, 1082);
  assert.equal(r.emptyBodyPosts, 437);
  assert.equal(r.imageLedPosts, 437);
});

test('every wp_posts ID is classified exactly once', { skip }, () => {
  const r = norm('reconciliation');
  assert.equal(r.unclassified, 0);
  assert.equal(r.classifiedIds, 2308);
  const sum = Object.values(r.buckets).reduce((a, b) => a + b, 0);
  assert.equal(sum, 2308);
});

test('source IDs are traceable: normalized sets partition the raw IDs', { skip }, () => {
  const rawIds = raw('wp_posts').map((p) => p.ID).sort((a, b) => a - b);
  const parts = [...norm('posts'), ...norm('pages'), ...norm('drafts'), ...norm('attachments'), ...norm('revisions').map((x) => ({ id: x.id }))].map((x) => x.id);
  const other = [...raw('wp_posts')].filter((p) => !['post', 'page', 'attachment', 'revision'].includes(p.post_type)).map((p) => p.ID);
  const all = [...parts, ...other].sort((a, b) => a - b);
  assert.equal(new Set(all).size, all.length, 'no ID appears in two buckets');
  assert.deepEqual(all, rawIds);
});

test('all 437 empty-body posts are image-led and kept (no invented text)', { skip }, () => {
  const posts = norm('posts');
  const empty = posts.filter((p) => p.content.trim() === '');
  assert.equal(empty.length, 437);
  assert.ok(empty.every((p) => p.featuredImageId && p.imageLed));
});

test('drafts: 19 real drafts become Sanity drafts, the auto-draft is archived', { skip }, () => {
  const d = norm('drafts');
  assert.equal(d.filter((x) => x.importAs === 'sanity-draft').length, 19);
  const auto = d.filter((x) => x.importAs === 'archive-only');
  assert.deepEqual(auto.map((x) => [x.id, x.status]), [[2723, 'auto-draft']]);
  assert.ok(d.every((x) => x.bucket));
});

test('attachments: all 799 have a local original file; featured images all resolve', { skip }, () => {
  const att = norm('attachments');
  assert.equal(att.length, 799);
  assert.ok(att.every((a) => a.localFileExists && a.relPath), 'missing local files: ' + att.filter((a) => !a.localFileExists).map((a) => a.id));
  const ids = new Set(att.map((a) => a.id));
  for (const p of [...norm('posts'), ...norm('pages'), ...norm('drafts')]) if (p.featuredImageId) assert.ok(ids.has(p.featuredImageId));
  assert.equal(norm('reconciliation').featuredImageDangling.length, 0);
});

test('slugs: decoded Marathi, unique per type, no percent-encoding', { skip }, () => {
  for (const [name, list] of [['posts', norm('posts')], ['pages', norm('pages')]]) {
    const seen = new Set();
    for (const r of list) {
      assert.ok(r.slug, `${name} ${r.id} has no slug`);
      assert.doesNotMatch(r.slug, /%[0-9a-f]{2}/i, `${name} ${r.id}`);
      assert.ok(!seen.has(r.slug), `duplicate ${name} slug ${r.slug}`);
      seen.add(r.slug);
    }
  }
  assert.ok(norm('posts').some((p) => /[\u0900-\u097F]/.test(p.slug)), 'Devanagari slugs must be preserved');
});

test('titles are plain text (no HTML / entities)', { skip }, () => {
  for (const r of [...norm('posts'), ...norm('pages')]) assert.doesNotMatch(r.title, /<[a-z/][^>]*>|&nbsp;|&amp;/i, `${r.id}: ${r.title}`);
  assert.equal(norm('posts').find((p) => p.id === 78).title, 'लम्पी व्हायरसचा धुमाकूळ,पशुपालक चिंतेत..');
});

test('comments are archived, none approved, none migrated', { skip }, () => {
  assert.deepEqual(norm('reconciliation').comments.byApproved, { 0: 1082 });
  assert.equal(norm('comments-archive').length, 1082);
});

test('menus and site settings recovered', { skip }, () => {
  const menus = norm('menus');
  assert.deepEqual(menus.map((m) => [m.location, m.items.length]).sort(), [['primary', 8], ['social', 4]]);
  const s = norm('site');
  assert.equal(s.activeTheme, 'Adore News');
  assert.equal(s.siteUrl, 'https://www.online24taas.com');
  assert.deepEqual(s.bannerPostIds, [89, 105, 178]);
  assert.ok(!s.activePlugins.some((p) => p.includes('elementor')), 'Elementor is not an active plugin');
});
