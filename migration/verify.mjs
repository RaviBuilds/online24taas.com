#!/usr/bin/env node
// verify.mjs — post-import verification against the LIVE dataset (not local state).
//
//   node migration/verify.mjs --project <id> --dataset <name> [--subset] [--use-cli-auth] [--report <path>]
//
// Checks, per manifest entry: remote existence, deterministic ids, types, slug/title/date equality with
// the WordPress source, taxonomy + author references, featured/inline image asset resolution,
// Portable Text text equality with the source HTML (Marathi Unicode integrity), draft/published
// separation, duplicates by wpPostId, and unresolved strong references.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadNormalized } from './lib/context.mjs';
import { htmlToComparablePlain, ptToComparablePlain } from './lib/portable-text.mjs';
import { makeClient, parseArgs, readJson, stateDir } from './lib/target.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs();
const { client, target } = makeClient(args, { needWrite: false });
const manifest = readJson(path.join(HERE, 'work/out', target.key + (args.subset ? '-subset' : ''), 'manifest.json'));
if (!manifest) throw new Error('manifest missing: run build-bundle first');

const failures = [];
const fail = (id, msg) => failures.push({ id, msg });
const report = { target: target.key, subset: !!args.subset, checkedAt: new Date().toISOString(), counts: {}, checks: {} };
const posts = new Map(loadNormalized('posts').map((p) => [p.id, p]));
const pages = new Map(loadNormalized('pages').map((p) => [p.id, p]));
const drafts = new Map(loadNormalized('drafts').map((p) => [p.id, p]));

// pull every document of the managed types in one pass
const TYPES = ['post', 'page', 'category', 'tag', 'author', 'mediaAsset', 'menu', 'siteSettings'];
const remote = await client.fetch(`*[_type in $types]`, { types: TYPES });
const byId = new Map(remote.map((d) => [d._id, d]));
report.counts.remoteByType = remote.reduce((a, d) => ((a[d._type + (d._id.startsWith('drafts.') ? ':draft' : '')] = (a[d._type + (d._id.startsWith('drafts.') ? ':draft' : '')] || 0) + 1), a), {});

// 1. every manifest entry exists with the right type
const expectType = { author: 'author', category: 'category', tag: 'tag', attachment: 'mediaAsset', post: 'post', page: 'page', draft: 'post', menu: 'menu', siteSettings: 'siteSettings' };
let present = 0;
for (const e of manifest.entries) {
  const d = byId.get(e.docId);
  if (!d) { fail(e.docId, `missing in dataset (source ${e.source})`); continue; }
  present++;
  if (d._type !== expectType[e.kind]) fail(e.docId, `wrong type ${d._type}`);
}
report.checks.manifestEntries = { expected: manifest.entries.length, present };

// 2. assets referenced anywhere must exist as sanity.imageAsset / fileAsset in THIS dataset
const assetRefs = new Set();
const collect = (v) => {
  if (Array.isArray(v)) v.forEach(collect);
  else if (v && typeof v === 'object') {
    if (typeof v._ref === 'string' && /^(image|file)-/.test(v._ref)) assetRefs.add(v._ref);
    Object.values(v).forEach(collect);
  }
};
remote.forEach(collect);
const assetDocs = await client.fetch(`*[_id in $ids]{_id, "wpId": source.id, "src": source.name, url}`, { ids: [...assetRefs] });
const assetOk = new Map(assetDocs.map((a) => [a._id, a]));
for (const r of assetRefs) if (!assetOk.has(r)) fail(r, 'asset reference does not resolve in this dataset');
report.checks.assetRefs = { referenced: assetRefs.size, resolved: assetOk.size };

// 3. dangling strong references across all managed docs
const allIds = new Set(byId.keys());
let danglingRefs = 0;
const walkRefs = (doc) => {
  const w = (v, p) => {
    if (Array.isArray(v)) v.forEach((x, i) => w(x, `${p}[${i}]`));
    else if (v && typeof v === 'object') {
      if (typeof v._ref === 'string') {
        const t = v._ref;
        if (!v._weak && !assetOk.has(t) && !allIds.has(t) && !allIds.has('drafts.' + t)) { danglingRefs++; fail(doc._id, `dangling reference ${t} at ${p}`); }
      } else Object.entries(v).forEach(([k, x]) => w(x, `${p}.${k}`));
    }
  };
  w(doc, '$');
};
remote.forEach(walkRefs);
report.checks.danglingStrongRefs = danglingRefs;

// 4. content fidelity against the WordPress source
let contentChecked = 0, textMatches = 0, imageLedChecked = 0;
for (const e of manifest.entries.filter((x) => ['post', 'page', 'draft'].includes(x.kind))) {
  const id = Number(e.source.split(':')[1]);
  const src = (e.kind === 'page' ? pages : e.kind === 'draft' ? drafts : posts).get(id);
  const d = byId.get(e.docId);
  if (!src || !d) continue;
  contentChecked++;
  if (d.title !== (src.title || undefined)) fail(d._id, `title differs: ${JSON.stringify(d.title)} vs ${JSON.stringify(src.title)}`);
  if (d.slug?.current !== src.slug) fail(d._id, `slug differs: ${d.slug?.current} vs ${src.slug}`);
  if (d.publishedAt !== src.publishedAt) fail(d._id, `publishedAt differs ${d.publishedAt} vs ${src.publishedAt}`);
  if (d.wpPostId !== id) fail(d._id, 'wpPostId mismatch');
  if (e.kind === 'draft' && !d._id.startsWith('drafts.')) fail(d._id, 'WordPress draft is not a Sanity draft');
  if (e.kind === 'draft' && byId.has(d._id.replace('drafts.', ''))) fail(d._id, 'WordPress draft also exists as published document');
  if (d._type === 'post') {
    const wantCats = src.categoryIds.map((c) => `category-${c}`).sort();
    const gotCats = (d.categories || []).map((r) => r._ref).sort();
    if (JSON.stringify(wantCats) !== JSON.stringify(gotCats)) fail(d._id, `categories differ ${gotCats} vs ${wantCats}`);
    const wantTags = src.tagIds.map((c) => `tag-${c}`).sort();
    const gotTags = (d.tags || []).map((r) => r._ref).sort();
    if (JSON.stringify(wantTags) !== JSON.stringify(gotTags)) fail(d._id, `tags differ`);
    if (src.featuredImageId) {
      if (d.featuredImage?.wpAttachmentId !== src.featuredImageId) fail(d._id, 'featured image attachment id differs');
      const aref = d.featuredImage?.asset?._ref;
      if (!aref || !assetOk.has(aref)) fail(d._id, 'featured image asset does not resolve');
    } else if (d.featuredImage) fail(d._id, 'unexpected featured image');
    if (d.author?._ref !== `author-${src.authorId}`) fail(d._id, 'author reference differs');
    if (src.imageLed) {
      imageLedChecked++;
      if ((d.body || []).length) fail(d._id, 'image-led post unexpectedly has a body (content was invented?)');
      if (!d.featuredImage?.asset) fail(d._id, 'image-led post lacks featured image');
    }
  }
  const a = htmlToComparablePlain(src.content);
  const b = ptToComparablePlain(d.body || []);
  if (a === b) textMatches++;
  else fail(d._id, `body text differs from source (src ${a.length} vs sanity ${b.length} chars)`);
  // inline images: count + resolution
  const srcImgs = (src.content.match(/<img\b[^>]*\b(src|class)=/g) || []).length;
  const imgs = (d.body || []).filter((x) => x._type === 'image');
  for (const im of imgs) if (!im.asset?._ref || !assetOk.has(im.asset._ref)) fail(d._id, `inline image unresolved (wp ${im.wpAttachmentId})`);
  if (imgs.length > srcImgs) fail(d._id, 'more images than source');
}
report.checks.content = { checked: contentChecked, bodyTextEqualsSource: textMatches, imageLedChecked };

// 5. duplicates by wpPostId (published and draft are distinct states of one logical doc)
const seen = new Map();
for (const d of remote.filter((x) => ['post', 'page'].includes(x._type))) {
  const k = `${d._type}:${d.wpPostId}`;
  const base = d._id.replace('drafts.', '');
  if (seen.has(k) && seen.get(k) !== base) fail(d._id, `duplicate wpPostId with ${seen.get(k)}`);
  seen.set(k, base);
}
const slugSeen = new Map();
for (const d of remote.filter((x) => ['post', 'page'].includes(x._type) && !x._id.startsWith('drafts.'))) {
  const k = `${d._type}:${d.slug?.current}`;
  if (slugSeen.has(k)) fail(d._id, `duplicate slug with ${slugSeen.get(k)}`);
  slugSeen.set(k, d._id);
}
report.checks.duplicates = failures.filter((f) => /duplicate/.test(f.msg)).length;

// 6. Unicode integrity: no percent-encoded Marathi, no replacement chars
let badText = 0;
for (const d of remote) {
  const { sourceSlug, ...rest } = d; // sourceSlug intentionally keeps the original percent-encoded WordPress slug
  const s = JSON.stringify(rest);
  if (/\uFFFD|%e0%a4|%E0%A4|à¤/.test(s)) { badText++; fail(d._id, 'corrupted or percent-encoded Devanagari'); }
}
report.checks.unicodeIssues = badText;

report.failures = failures;
report.ok = failures.length === 0;
const outPath = args.report || path.join(stateDir(target), args.subset ? 'verify-subset.json' : 'verify.json');
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, failures: failures.length }, null, 2));
failures.slice(0, 30).forEach((f) => console.log('  ✗', f.id, f.msg));
console.log(report.ok ? 'VERIFY OK' : `VERIFY FAILED (${failures.length})`);
process.exit(report.ok ? 0 : 1);
