#!/usr/bin/env node
// build-bundle.mjs — normalized WordPress data -> Sanity documents (NDJSON) + source->target manifest.
//
//   node migration/build-bundle.mjs --project <id> --dataset <name> [--ids 10,78,...] [--out <dir>]
//        [--allow-missing-assets]
//
// Output (migration/work/out/<project>.<dataset>[-subset]/):
//   documents.ndjson   one Sanity document per line, ready for `sanity dataset import` OR import.mjs
//   manifest.json      every source WordPress ID -> Sanity _id / classification / exclusion reason
//   transform-report.json  Portable Text diagnostics (raw-HTML fallbacks, dropped attributes, ...)
//
// Document order matters for strong references: authors, taxonomy, media, content, menus, settings.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { buildContext, loadNormalized } from './lib/context.mjs';
import { htmlToPortableText } from './lib/portable-text.mjs';
import { parseArgs, resolveTarget, stateDir, readJson } from './lib/target.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs();
const target = resolveTarget(args);
const subset = args.ids ? new Set(String(args.ids).split(',').map(Number)) : null;
const outDir = args.out || path.join(HERE, 'work/out', target.key + (subset ? '-subset' : ''));
fs.mkdirSync(outDir, { recursive: true });

const authors = loadNormalized('authors');
const categories = loadNormalized('categories');
const tags = loadNormalized('tags');
const posts = loadNormalized('posts');
const pages = loadNormalized('pages');
const drafts = loadNormalized('drafts');
const attachments = loadNormalized('attachments');
const menus = loadNormalized('menus');
const site = loadNormalized('site');
const assetMap = readJson(path.join(stateDir(target), 'assets.json'), {});
const ctx = buildContext({ attachments, posts, pages, categories, tags });

const ref = (id, extra = {}) => ({ _type: 'reference', _ref: id, ...extra });
const docs = [];
const manifest = { target: target.key, generatedAt: null, subset: subset ? [...subset] : null, entries: [], excluded: [] };
const transformReport = { totals: { documents: 0, rawHtmlBlocks: 0, imageBlocks: 0, unresolvedImages: 0, emptyImagePlaceholders: 0, colorMarks: 0 }, rawHtml: [], droppedAttributes: {}, alignedBlocks: {}, perDoc: {} };
const missingAssets = new Set();

function imageField(attachmentId, { alt, caption } = {}) {
  const att = ctx.attById.get(attachmentId);
  const m = assetMap[attachmentId];
  if (!m) missingAssets.add(attachmentId);
  const out = { _type: 'image' };
  if (m) out.asset = ref(m.assetId);
  const a = alt ?? att?.alt;
  if (a) out.alt = a;
  const c = caption ?? att?.caption;
  if (c) out.caption = c;
  out.wpAttachmentId = attachmentId;
  return out;
}

function bodyFor(record) {
  const { blocks, diagnostics: d } = htmlToPortableText(record.content, {
    resolveImage: ctx.resolveImage,
    rewriteHref: ctx.rewriteHref,
  });
  const body = blocks.map((b) => {
    if (b._type !== 'image') return b;
    const att = b.wpAttachmentId ? ctx.attById.get(b.wpAttachmentId) : null;
    const img = imageField(b.wpAttachmentId, { alt: b.alt || att?.alt || '', caption: b.caption || att?.caption || '' });
    if (b.sourceUrl) img.sourceUrl = b.sourceUrl;
    return { _key: b._key, ...img };
  });
  const t = transformReport.totals;
  t.documents++;
  t.rawHtmlBlocks += d.rawHtmlBlocks.length;
  t.imageBlocks += body.filter((b) => b._type === 'image').length;
  t.unresolvedImages += d.unresolvedImages.length;
  t.emptyImagePlaceholders += d.emptyImagePlaceholders;
  t.colorMarks += d.colorMarks;
  for (const [k, v] of Object.entries(d.droppedAttributes)) transformReport.droppedAttributes[k] = (transformReport.droppedAttributes[k] || 0) + v;
  for (const [k, v] of Object.entries(d.alignedBlocks)) transformReport.alignedBlocks[k] = (transformReport.alignedBlocks[k] || 0) + v;
  for (const r of d.rawHtmlBlocks) transformReport.rawHtml.push({ wpId: record.id, ...r });
  if (d.unresolvedImages.length) transformReport.perDoc[record.id] = { unresolvedImages: d.unresolvedImages };
  return body;
}

const withKeys = (items, prefix) => items.map((r, i) => ({ ...r, _key: `${prefix}${i}` }));

function contentDoc(record, type, { draft = false } = {}) {
  const id = (draft ? 'drafts.' : '') + `${type}-${record.id}`;
  const doc = {
    _id: id,
    _type: type,
    title: record.title || undefined,
    slug: { _type: 'slug', current: record.slug },
    publishedAt: record.publishedAt,
    modifiedAt: record.modifiedAt,
  };
  if (type === 'post') {
    if (record.excerpt) doc.excerpt = record.excerpt;
    if (record.featuredImageId) doc.featuredImage = imageField(record.featuredImageId);
    if (record.authorId) doc.author = ref(`author-${record.authorId}`);
  }
  const body = record.content.trim() ? bodyFor(record) : [];
  if (body.length) doc.body = body;
  if (type === 'post') {
    if (record.categoryIds.length) doc.categories = withKeys(record.categoryIds.map((c) => ref(`category-${c}`)), 'c');
    if (record.tagIds.length) doc.tags = withKeys(record.tagIds.map((t) => ref(`tag-${t}`)), 't');
  }
  const seo = {};
  if (record.seoTitle) seo.seoTitle = record.seoTitle;
  if (record.metaDescription) seo.metaDescription = record.metaDescription;
  if (record.focusKeyword) seo.focusKeyword = record.focusKeyword;
  if (record.canonical) seo.canonicalUrl = record.canonical;
  if (Object.keys(seo).length) doc.seo = { _type: 'seo', ...seo };
  doc.wpPostId = record.id;
  doc.wpStatus = record.status;
  doc.sourceFormat = record.contentClass || (record.content.trim() ? (record.content.includes('<!-- wp:') ? 'gutenberg' : 'legacy-html') : 'empty');
  doc.legacyUrl = record.legacyUrl;
  if (type === 'post') doc.sourceSlug = record.sourceSlug;
  return doc;
}

const inSubset = (id) => !subset || subset.has(id);

// 1. authors
for (const a of authors) {
  docs.push({ _id: a._id, _type: 'author', name: a.name, slug: { _type: 'slug', current: a.slug }, wpUserId: a.id });
  manifest.entries.push({ source: `wp_users:${a.id}`, kind: 'author', docId: a._id });
}
// 2. taxonomy
for (const c of categories) {
  docs.push({ _id: c._id, _type: 'category', title: c.title, slug: { _type: 'slug', current: c.slug }, ...(c.description ? { description: c.description } : {}), wpTermId: c.id, sourceSlug: c.sourceSlug });
  manifest.entries.push({ source: `wp_terms:${c.id}`, kind: 'category', docId: c._id });
}
for (const t of tags) {
  docs.push({ _id: t._id, _type: 'tag', title: t.title, slug: { _type: 'slug', current: t.slug }, wpTermId: t.id, sourceSlug: t.sourceSlug });
  manifest.entries.push({ source: `wp_terms:${t.id}`, kind: 'tag', docId: t._id });
}

// 3. content selection
const selPosts = posts.filter((p) => inSubset(p.id));
const selPages = pages.filter((p) => inSubset(p.id));
const selDrafts = drafts.filter((d) => d.importAs === 'sanity-draft' && inSubset(d.id));

// 4. media records: all attachments (full) or only those referenced by the subset
const neededAtt = new Set();
if (!subset) attachments.forEach((a) => neededAtt.add(a.id));
const contentDocs = [];
for (const r of selPosts) contentDocs.push({ r, doc: contentDoc(r, 'post') });
for (const r of selPages) contentDocs.push({ r, doc: contentDoc(r, 'page') });
for (const r of selDrafts) contentDocs.push({ r, doc: contentDoc(r, 'post', { draft: true }) });
if (subset) {
  for (const { doc } of contentDocs) {
    if (doc.featuredImage?.wpAttachmentId) neededAtt.add(doc.featuredImage.wpAttachmentId);
    for (const b of doc.body || []) if (b._type === 'image' && b.wpAttachmentId) neededAtt.add(b.wpAttachmentId);
  }
}
for (const a of attachments.filter((x) => neededAtt.has(x.id))) {
  const m = assetMap[a.id];
  if (!m) missingAssets.add(a.id);
  const d = {
    _id: a._id,
    _type: 'mediaAsset',
    title: a.title,
    ...(a.alt ? { alt: a.alt } : {}),
    ...(a.caption ? { caption: a.caption } : {}),
    ...(a.description ? { description: a.description } : {}),
    mimeType: a.mimeType,
    wpAttachmentId: a.id,
    ...(a.parentId ? { wpParentId: a.parentId } : {}),
    originalPath: a.relPath,
    legacyUrl: a.legacyUrl,
  };
  if (m) d[m.type === 'image' ? 'image' : 'file'] = { _type: m.type === 'image' ? 'image' : 'file', asset: ref(m.assetId) };
  docs.push(d);
  manifest.entries.push({ source: `wp_posts:${a.id}`, kind: 'attachment', docId: a._id, assetId: m?.assetId ?? null });
}

// 5. posts / pages / drafts
for (const { r, doc } of contentDocs) {
  docs.push(doc);
  manifest.entries.push({
    source: `wp_posts:${r.id}`,
    kind: doc._id.startsWith('drafts.') ? 'draft' : doc._type,
    docId: doc._id,
    slug: r.slug,
    bodyBlocks: doc.body?.length ?? 0,
    imageLed: !!r.imageLed,
    draftBucket: r.bucket,
  });
}

// 6. menus + settings (full runs only)
if (!subset) {
  for (const m of menus) {
    const items = m.items.map((it, i) => {
      const base = { _key: `i${i}`, _type: 'menuItem', label: it.label };
      if (it.type === 'taxonomy' && it.object === 'category') return { ...base, ref: ref(`category-${it.objectId}`, { _weak: true }) };
      if (it.type === 'custom') return { ...base, url: it.url };
      return { ...base, url: '/' };
    });
    docs.push({ _id: m._id, _type: 'menu', title: m.title, location: m.location, items });
    manifest.entries.push({ source: `wp_posts:menu:${m.id}`, kind: 'menu', docId: m._id });
  }
  const bannerRefs = site.bannerPostIds.filter((id) => posts.some((p) => p.id === id)).map((id, i) => ({ _key: `f${i}`, ...ref(`post-${id}`, { _weak: true }) }));
  const settings = {
    _id: 'siteSettings',
    _type: 'siteSettings',
    title: site.title,
    tagline: site.tagline,
    featuredPosts: bannerRefs,
    socialLinks: site.socialLinks.map((s, i) => ({ _key: `s${i}`, label: s.label, url: s.url })),
    footerText: `© ${site.title}`,
  };
  if (site.adsensePublisherId) settings.adsensePublisherId = site.adsensePublisherId;
  if (site.headerImageAttachmentId && assetMap[site.headerImageAttachmentId]) settings.logo = { _type: 'image', asset: ref(assetMap[site.headerImageAttachmentId].assetId) };
  if (site.siteIconAttachmentId && assetMap[site.siteIconAttachmentId]) settings.favicon = { _type: 'image', asset: ref(assetMap[site.siteIconAttachmentId].assetId) };
  docs.push(settings);
  manifest.entries.push({ source: 'wp_options', kind: 'siteSettings', docId: 'siteSettings' });
}

// 7. explicit exclusions (proves nothing is dropped silently)
if (!subset) {
  for (const d of drafts.filter((x) => x.importAs === 'archive-only')) manifest.excluded.push({ source: `wp_posts:${d.id}`, reason: 'auto-draft (WordPress scaffolding, no content)' });
  for (const r of loadNormalized('revisions')) manifest.excluded.push({ source: `wp_posts:${r.id}`, reason: `revision of ${r.parentType} ${r.parent}; retained only in SQL backup (no content missing from live posts)` });
}

if (missingAssets.size && !args['allow-missing-assets']) {
  console.error(`ERROR: ${missingAssets.size} referenced attachment(s) have no uploaded asset in state for ${target.key} (e.g. ${[...missingAssets].slice(0, 8).join(', ')}). Run upload-assets.mjs first or pass --allow-missing-assets.`);
  process.exit(2);
}

manifest.generatedAt = new Date().toISOString();
manifest.missingAssets = [...missingAssets].sort((a, b) => a - b);
manifest.counts = docs.reduce((a, d) => ((a[d._type] = (a[d._type] || 0) + 1), a), {});
const clean = (v) => JSON.parse(JSON.stringify(v));
const lines = docs.map((d) => JSON.stringify(clean(d)));
fs.writeFileSync(path.join(outDir, 'documents.ndjson'), lines.join('\n') + '\n');
manifest.documentsSha256 = crypto.createHash('sha256').update(lines.join('\n')).digest('hex');
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(outDir, 'transform-report.json'), JSON.stringify(transformReport, null, 2) + '\n');
console.log(`wrote ${docs.length} documents -> ${path.relative(process.cwd(), outDir)}`);
console.log(JSON.stringify(manifest.counts));
if (missingAssets.size) console.log(`WARNING: ${missingAssets.size} attachments without uploaded assets (allowed)`);
