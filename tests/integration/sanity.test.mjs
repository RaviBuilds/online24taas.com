// Live-dataset assertions. Needs read access to the target dataset:
//   SANITY_TARGET_PROJECT=qvtcbb1j SANITY_TARGET_DATASET=migration-test SANITY_API_READ_TOKEN=... npm run test:integration
// (or SANITY_USE_CLI_AUTH=1 to reuse the `sanity login` session). Skipped when nothing is configured.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createClient } from '@sanity/client';
import { ROOT, norm, haveWork } from '../unit/helpers.mjs';

const projectId = process.env.SANITY_TARGET_PROJECT;
const dataset = process.env.SANITY_TARGET_DATASET;
let token = process.env.SANITY_API_READ_TOKEN || process.env.SANITY_API_WRITE_TOKEN;
if (!token && process.env.SANITY_USE_CLI_AUTH) {
  try { token = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/sanity/config.json'), 'utf8')).authToken; } catch { /* none */ }
}
const skip = !(projectId && dataset && haveWork) && 'set SANITY_TARGET_PROJECT / SANITY_TARGET_DATASET and run the migration first';
const client = skip ? null : createClient({ projectId, dataset, apiVersion: '2025-02-19', token, useCdn: false, perspective: 'raw' });
const q = (groq, params) => client.fetch(groq, params);

test('document counts match the WordPress source', { skip }, async () => {
  assert.equal(await q('count(*[_type=="post" && !(_id in path("drafts.**"))])'), 660);
  assert.equal(await q('count(*[_type=="post" && _id in path("drafts.**")])'), 19);
  assert.equal(await q('count(*[_type=="page" && !(_id in path("drafts.**"))])'), 5);
  assert.equal(await q('count(*[_type=="category"])'), 14);
  assert.equal(await q('count(*[_type=="tag"])'), 89);
  assert.equal(await q('count(*[_type=="author"])'), 1);
  assert.equal(await q('count(*[_type=="mediaAsset"])'), 799);
  assert.equal(await q('count(*[_type=="siteSettings"])'), 1);
});

test('deterministic ids: every source post/page exists under post-<id>/page-<id>', { skip }, async () => {
  const have = new Set(await q('*[_type in ["post","page"] && !(_id in path("drafts.**"))]._id'));
  for (const p of norm('posts')) assert.ok(have.has(`post-${p.id}`), `post-${p.id} missing`);
  for (const p of norm('pages')) assert.ok(have.has(`page-${p.id}`), `page-${p.id} missing`);
});

test('no duplicates: wpPostId and slug are unique among published documents', { skip }, async () => {
  const rows = await q('*[_type in ["post","page"] && !(_id in path("drafts.**"))]{_type, wpPostId, "slug": slug.current}');
  const a = new Set(rows.map((r) => `${r._type}:${r.wpPostId}`));
  const b = new Set(rows.map((r) => `${r._type}:${r.slug}`));
  assert.equal(a.size, rows.length);
  assert.equal(b.size, rows.length);
});

test('every WordPress draft is a Sanity draft and none is also published', { skip }, async () => {
  const drafts = norm('drafts').filter((d) => d.importAs === 'sanity-draft');
  const ids = new Set(await q('*[_type=="post" && _id in path("drafts.**")]._id'));
  for (const d of drafts) {
    assert.ok(ids.has(`drafts.post-${d.id}`), `drafts.post-${d.id} missing`);
    assert.equal(await q('count(*[_id==$id])', { id: `post-${d.id}` }), 0, `post-${d.id} must not be published`);
  }
});

test('the published perspective never returns drafts', { skip }, async () => {
  const pub = createClient({ projectId, dataset, apiVersion: '2025-02-19', token, useCdn: false, perspective: 'published' });
  assert.equal(await pub.fetch('count(*[_id in path("drafts.**")])'), 0);
  assert.equal(await pub.fetch('count(*[_type=="post"])'), 660);
});

test('references resolve: authors, categories, tags and image assets', { skip }, async () => {
  const dangling = await q(`*[_type=="post" && !(_id in path("drafts.**"))]{
    _id,
    "badAuthor": defined(author) && !defined(author->_id),
    "badCats": count(categories[!defined(@->_id)]),
    "badTags": count(tags[!defined(@->_id)]),
    "badFeatured": defined(featuredImage) && !defined(featuredImage.asset->_id),
    "badInline": count(body[_type=="image" && !defined(asset->_id)])
  }[badAuthor || badCats > 0 || badTags > 0 || badFeatured || badInline > 0]`);
  assert.deepEqual(dangling, []);
});

test('image-led posts keep an empty body and a featured image', { skip }, async () => {
  // 437 posts have a literally empty post_content; 4 more (245, 269, 854, 1119) contain only empty
  // paragraph / empty-image placeholder markup, which converts to no blocks. All have a featured image.
  const ids = await q('*[_type=="post" && !(_id in path("drafts.**")) && !defined(body) && defined(featuredImage.asset)].wpPostId');
  assert.equal(ids.length, 441);
  const literallyEmpty = new Set(norm('posts').filter((p) => p.content.trim() === '').map((p) => p.id));
  assert.equal(literallyEmpty.size, 437);
  for (const id of literallyEmpty) assert.ok(ids.includes(id), `image-led post ${id} lost`);
  assert.deepEqual(ids.filter((id) => !literallyEmpty.has(id)).sort((a, b) => a - b), [245, 269, 854, 1119]);
});

test('Marathi Unicode is intact in titles', { skip }, async () => {
  const titles = await q('*[_type in ["post","page"]]{_id, title}');
  const bad = titles.filter((t) => /\uFFFD|%e0%a4|à¤/i.test(t.title || ''));
  assert.deepEqual(bad, []);
  assert.ok(titles.filter((t) => /[\u0900-\u097F]/.test(t.title || '')).length > 600);
  assert.equal(await q('*[_id=="post-78"][0].title'), 'लम्पी व्हायरसचा धुमाकूळ,पशुपालक चिंतेत..');
});

test('uploaded assets carry the WordPress attachment id', { skip }, async () => {
  // 799 attachments, but identical binaries are stored once by Sanity (content-addressed), so fewer assets.
  // Only assets referenced by migrated mediaAsset documents are checked: a production dataset may also hold
  // unreferenced assets from earlier experiments, which the migration never touches (listed in the reports).
  const used = await q('array::unique(*[_type=="mediaAsset" && defined(image.asset._ref)].image.asset._ref)');
  const total = await q('count(*[_type=="sanity.imageAsset" && _id in $ids])', { ids: used });
  const withSource = await q('count(*[_type=="sanity.imageAsset" && _id in $ids && source.name=="wordpress" && defined(source.id)])', { ids: used });
  assert.equal(withSource, total);
  assert.ok(total >= 650 && total <= 799, `image assets: ${total}`);
});

test('verify.mjs (source-text equality, taxonomy, assets) passes against the live dataset', { skip: skip || (!token && 'no credentials') }, () => {
  const args = ['migration/verify.mjs', '--project', projectId, '--dataset', dataset, ...(process.env.SANITY_USE_CLI_AUTH ? ['--use-cli-auth'] : [])];
  const r = spawnSync('node', args, { cwd: ROOT, encoding: 'utf8', env: process.env });
  assert.equal(r.status, 0, r.stdout.slice(-1500) + r.stderr.slice(-500));
});
