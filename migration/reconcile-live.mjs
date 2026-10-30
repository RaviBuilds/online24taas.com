#!/usr/bin/env node
// reconcile-live.mjs — independent source-vs-live comparison for the production dataset.
// Reads the normalized WordPress source and the LIVE dataset (read-only) and writes
// migration/reports/<project>.<dataset>/live-reconciliation.json. Exit code 1 on any mismatch.
//   node migration/reconcile-live.mjs --project mkiaioc7 --dataset production --use-cli-auth
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeClient, parseArgs } from './lib/target.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs();
const { client, target } = makeClient(args, { needWrite: false });
const N = (f) => JSON.parse(fs.readFileSync(path.join(HERE, 'work/normalized', f), 'utf8'));
const posts = N('posts.json'), pages = N('pages.json'), drafts = N('drafts.json');
const cats = N('categories.json'), tags = N('tags.json'), authors = N('authors.json'), atts = N('attachments.json');
const rev = N('revisions.json'), comments = N('comments-archive.json');

const live = await client.fetch(`*[_type in ["post","page","category","tag","author","mediaAsset"]]`);
const byId = new Map(live.map((d) => [d._id, d]));
const out = { target: target.key, checkedAt: new Date().toISOString(), sections: {}, mismatches: [] };
const miss = (kind, id, why) => out.mismatches.push({ kind, id, why });
const sec = (name, expected, found) => (out.sections[name] = { expected, found, ok: expected === found });

// ---- counts
const livePub = live.filter((d) => d._type === 'post' && !d._id.startsWith('drafts.'));
const liveDraft = live.filter((d) => d._type === 'post' && d._id.startsWith('drafts.'));
sec('publishedPosts', posts.length, livePub.length);
sec('pages', pages.length, live.filter((d) => d._type === 'page').length);
const recoverable = drafts.filter((d) => d.status === 'draft');
const autoDrafts = drafts.filter((d) => d.status === 'auto-draft');
sec('recoverableDrafts', recoverable.length, liveDraft.length);
sec('autoDraftsPublishedOrDrafted', 0, autoDrafts.filter((d) => byId.has(d._id) || byId.has('drafts.' + d._id)).length);
sec('categories', cats.length, live.filter((d) => d._type === 'category').length);
sec('tags', tags.length, live.filter((d) => d._type === 'tag').length);
sec('authors', authors.length, live.filter((d) => d._type === 'author').length);
sec('attachmentRecords', atts.length, live.filter((d) => d._type === 'mediaAsset').length);
const distinct = new Set(live.filter((d) => d._type === 'mediaAsset').map((d) => (d.image || d.file)?.asset?._ref).filter(Boolean));
sec('distinctUnderlyingAssets', 697, distinct.size);

// ---- per-record
const idOf = (d) => d.wpPostId;
for (const p of posts) {
  const d = byId.get(p._id);
  if (!d) { miss('post', p.id, 'missing'); continue; }
  if (d.wpPostId !== p.id) miss('post', p.id, 'wpPostId');
  if (d.title !== p.title) miss('post', p.id, 'title');
  if (d.slug?.current !== p.slug) miss('post', p.id, `slug ${d.slug?.current} != ${p.slug}`);
  if (/%[0-9a-f]{2}/i.test(d.slug?.current || '')) miss('post', p.id, 'percent-encoded slug');
  if (new Date(d.publishedAt).getTime() !== new Date(p.publishedAt).getTime()) miss('post', p.id, 'publishedAt');
  if ((d.author?._ref) !== `author-${p.authorId}`) miss('post', p.id, 'author');
  const dc = (d.categories || []).map((r) => r._ref).sort().join(), sc = p.categoryIds.map((i) => `category-${i}`).sort().join();
  if (dc !== sc) miss('post', p.id, `categories ${dc} != ${sc}`);
  const dt = (d.tags || []).map((r) => r._ref).sort().join(), st = p.tagIds.map((i) => `tag-${i}`).sort().join();
  if (dt !== st) miss('post', p.id, 'tags');
  const wantImg = p.featuredImageId && !p.featuredImageDangling;
  if (!!d.featuredImage?.asset?._ref !== !!wantImg) miss('post', p.id, 'featuredImage presence');
  if (p.seoTitle && d.seo?.seoTitle !== p.seoTitle) miss('post', p.id, 'seoTitle');
  if (p.metaDescription && d.seo?.metaDescription !== p.metaDescription) miss('post', p.id, 'metaDescription');
  if (p.focusKeyword && d.seo?.focusKeyword !== p.focusKeyword) miss('post', p.id, 'focusKeyword');
  if (p.canonical && d.seo?.canonicalUrl !== p.canonical) miss('post', p.id, 'canonical');
  if (/\uFFFD|%e0%a4|à¤/i.test(d.title || '')) miss('post', p.id, 'unicode');
}
for (const p of pages) {
  const d = byId.get(p._id);
  if (!d) { miss('page', p.id, 'missing'); continue; }
  if (d.title !== p.title || d.slug?.current !== p.slug || d.wpPostId !== p.id) miss('page', p.id, 'title/slug/id');
}
for (const p of recoverable) {
  const d = byId.get('drafts.' + p._id);
  if (!d) { miss('draft', p.id, 'missing'); continue; }
  if ((d.title ?? '') !== (p.title ?? '') || d.wpPostId !== p.id) miss('draft', p.id, 'title/id'); // source titles may be empty; Sanity stores them as absent
  if (byId.has(p._id)) miss('draft', p.id, 'also published');
}
for (const c of cats) { const d = byId.get(c._id); if (!d || d.wpTermId !== c.id || d.slug?.current !== c.slug || /%[0-9a-f]{2}/i.test(d.slug?.current)) miss('category', c.id, 'missing/slug'); }
for (const t of tags) { const d = byId.get(t._id); if (!d || d.wpTermId !== t.id || d.slug?.current !== t.slug || /%[0-9a-f]{2}/i.test(d.slug?.current)) miss('tag', t.id, 'missing/slug'); }
for (const a of atts) { const d = byId.get(a._id); if (!d || d.wpAttachmentId !== a.id || !(d.image || d.file)?.asset?._ref) miss('attachment', a.id, 'missing/asset'); }

// ---- uniqueness + dangling refs
const dup = (arr, key) => arr.length - new Set(arr.map(key)).size;
sec('duplicateWpPostIds', 0, dup(livePub, idOf));
sec('duplicateSlugsAmongPublished', 0, dup([...livePub, ...live.filter((d) => d._type === 'page')], (d) => d._type + ':' + d.slug.current));
const refs = new Set(); const walk = (v) => { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') { if (typeof v._ref === 'string') refs.add(v._ref); Object.values(v).forEach(walk); } };
live.forEach(walk);
const allIds = new Set(await client.fetch('*._id'));
sec('danglingReferences', 0, [...refs].filter((r) => !allIds.has(r)).length);

// ---- image-led posts
const imageLed = posts.filter((p) => p.imageLed);
sec('imageLedPosts', 437, imageLed.length);
sec('imageLedPostsWithFeaturedImageInSanity', imageLed.length, imageLed.filter((p) => byId.get(p._id)?.featuredImage?.asset?._ref).length);
const noBody = livePub.filter((d) => !(d.body || []).length);
sec('publishedPostsWithoutBodyBlocks(437 empty + 4 placeholder-only)', 441, noBody.length);
const emptyBodyIds = new Set(posts.filter((p) => p.contentClass === 'empty-body').map((p) => p._id));
const placeholderOnly = noBody.filter((d) => !emptyBodyIds.has(d._id));
sec('placeholderOnlyPosts(gutenberg source, no body blocks)', 4, placeholderOnly.length);
out.placeholderOnlyPostIds = placeholderOnly.map((d) => d.wpPostId).sort((a, b) => a - b);
sec('bodylessPostsMissingFeaturedImage', 0, noBody.filter((d) => !d.featuredImage?.asset?._ref).length);

// ---- excluded by policy (documented, not in dataset)
out.excludedByPolicy = { revisions: rev.length, unapprovedComments: comments.length, autoDraftIds: autoDrafts.map((d) => d.id) };
sec('commentsInDataset', 0, (await client.fetch('count(*[_type match "comment*"])')));

out.ok = out.mismatches.length === 0 && Object.values(out.sections).every((s) => s.ok);
const dir = path.join(HERE, 'reports', target.key);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'live-reconciliation.json'), JSON.stringify(out, null, 2));
for (const [k, v] of Object.entries(out.sections)) console.log(`${v.ok ? 'OK  ' : 'FAIL'} ${k}: expected=${v.expected} found=${v.found}`);
console.log(`mismatches: ${out.mismatches.length}`, out.mismatches.slice(0, 15));
console.log(out.ok ? 'RECONCILIATION OK' : 'RECONCILIATION FAILED');
process.exit(out.ok ? 0 : 1);
