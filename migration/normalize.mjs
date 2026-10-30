#!/usr/bin/env node
// normalize.mjs — raw parsed WordPress tables (migration/work/raw) -> normalized entities
// (migration/work/normalized). Pure data shaping: no network, no writes outside migration/work.
//
//   node migration/normalize.mjs [--wp-root <dir>]
//
// Every WordPress post ID in wp_posts is classified into exactly one bucket; the reconciliation
// file proves nothing is dropped silently.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { phpUnserialize } from './lib/php-unserialize.mjs';
import { cleanTitle } from './lib/text.mjs';
import { assignUniqueSlugs, decodeSlug, slugifyFallback, WP_SLUG_TRUNCATED_AT } from './lib/slug.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const WORK = path.join(HERE, 'work');
const RAW = path.join(WORK, 'raw');
const OUT = path.join(WORK, 'normalized');

const argv = process.argv.slice(2);
const argVal = (k, d) => {
  const i = argv.indexOf(k);
  return i >= 0 ? argv[i + 1] : d;
};
const WP_ROOT = argVal('--wp-root', path.resolve(HERE, '../../online24taas'));
const UPLOADS = path.join(WP_ROOT, 'wp-content/uploads');
const SITE_URL = 'https://www.online24taas.com';

const readRaw = (t) => JSON.parse(fs.readFileSync(path.join(RAW, t + '.json'), 'utf8'));
const write = (name, data) => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2) + '\n');
};
const iso = (d) => (d && d !== '0000-00-00 00:00:00' ? d.replace(' ', 'T') + 'Z' : null);
const safeUnserialize = (s) => {
  try {
    return phpUnserialize(s);
  } catch {
    return null;
  }
};

const posts = readRaw('wp_posts');
const postmeta = readRaw('wp_postmeta');
const terms = readRaw('wp_terms');
const taxonomy = readRaw('wp_term_taxonomy');
const rels = readRaw('wp_term_relationships');
const users = readRaw('wp_users');
const comments = readRaw('wp_comments');
const options = Object.fromEntries(readRaw('wp_options').map((o) => [o.option_name, o.option_value]));

// ---------- lookups ----------
const metaBy = new Map();
for (const m of postmeta) {
  if (!metaBy.has(m.post_id)) metaBy.set(m.post_id, {});
  const bag = metaBy.get(m.post_id);
  if (!(m.meta_key in bag)) bag[m.meta_key] = m.meta_value;
}
const meta = (id) => metaBy.get(id) || {};
const postById = new Map(posts.map((p) => [p.ID, p]));
const termById = new Map(terms.map((t) => [t.term_id, t]));
const ttById = new Map(taxonomy.map((t) => [t.term_taxonomy_id, t]));
const relsByObj = new Map();
for (const r of rels) {
  if (!relsByObj.has(r.object_id)) relsByObj.set(r.object_id, []);
  relsByObj.get(r.object_id).push(r.term_taxonomy_id);
}
function termsOf(objectId, tax) {
  const out = [];
  for (const ttid of relsByObj.get(objectId) || []) {
    const tt = ttById.get(ttid);
    if (tt && tt.taxonomy === tax) out.push(tt.term_id);
  }
  return out.sort((a, b) => a - b);
}

// ---------- authors ----------
const authors = users.map((u) => ({
  id: u.ID,
  _id: `author-${u.ID}`,
  name: u.display_name || u.user_nicename || `user-${u.ID}`,
  slug: decodeSlug(u.user_nicename || `user-${u.ID}`),
  registeredAt: iso(u.user_registered),
  // login/email deliberately omitted from the content model (PII); retained only in the SQL backup.
}));

// ---------- taxonomy ----------
function buildTerms(tax, prefix) {
  const rows = taxonomy
    .filter((t) => t.taxonomy === tax)
    .map((tt) => {
      const t = termById.get(tt.term_id);
      return { id: t.term_id, title: t.name, sourceSlug: t.slug, description: tt.description || '', parent: tt.parent || 0, count: tt.count };
    });
  const slugs = assignUniqueSlugs(rows);
  return rows
    .sort((a, b) => a.id - b.id)
    .map((r) => ({
      id: r.id,
      _id: `${prefix}-${r.id}`,
      title: r.title,
      slug: slugs.get(r.id).slug,
      sourceSlug: r.sourceSlug,
      slugCollided: slugs.get(r.id).collided,
      description: r.description,
      parent: r.parent,
      wpCount: r.count,
    }));
}
const categories = buildTerms('category', 'category');
const tags = buildTerms('post_tag', 'tag');

// ---------- attachments ----------
const attachments = posts
  .filter((p) => p.post_type === 'attachment')
  .sort((a, b) => a.ID - b.ID)
  .map((p) => {
    const m = meta(p.ID);
    const md = m._wp_attachment_metadata ? safeUnserialize(m._wp_attachment_metadata) : null;
    const rel = m._wp_attached_file || null;
    const files = new Set();
    if (rel) files.add(rel);
    const dir = rel ? path.posix.dirname(rel) : '';
    if (md?.sizes) for (const s of Object.values(md.sizes)) if (s?.file) files.add(path.posix.join(dir, s.file));
    if (md?.original_image) files.add(path.posix.join(dir, md.original_image));
    const backup = m._wp_attachment_backup_sizes ? safeUnserialize(m._wp_attachment_backup_sizes) : null;
    if (backup) for (const s of Object.values(backup)) if (s?.file) files.add(path.posix.join(dir, s.file));
    const abs = rel ? path.join(UPLOADS, rel) : null;
    const exists = abs ? fs.existsSync(abs) : false;
    return {
      id: p.ID,
      _id: `mediaAsset-${p.ID}`,
      title: p.post_title,
      alt: m._wp_attachment_image_alt || '',
      caption: p.post_excerpt || '',
      description: p.post_content || '',
      mimeType: p.post_mime_type,
      parentId: p.post_parent || null,
      uploadedAt: iso(p.post_date_gmt) || iso(p.post_date),
      relPath: rel,
      originalImage: md?.original_image ? path.posix.join(dir, md.original_image) : null,
      width: md?.width ?? null,
      height: md?.height ?? null,
      filesize: md?.filesize ?? null,
      legacyUrl: p.guid,
      localFileExists: exists,
      knownFiles: [...files].sort(),
    };
  });
const attachmentById = new Map(attachments.map((a) => [a.id, a]));

// ---------- posts / pages / drafts ----------
function baseRecord(p) {
  const m = meta(p.ID);
  const thumb = m._thumbnail_id ? Number(m._thumbnail_id) : null;
  const cats = termsOf(p.ID, 'category');
  const tg = termsOf(p.ID, 'post_tag');
  return {
    id: p.ID,
    type: p.post_type,
    status: p.post_status,
    title: cleanTitle(p.post_title),
    titleRaw: cleanTitle(p.post_title) === p.post_title ? undefined : p.post_title,
    sourceSlug: p.post_name,
    publishedAt: iso(p.post_date_gmt) || iso(p.post_date),
    modifiedAt: iso(p.post_modified_gmt) || iso(p.post_modified),
    excerpt: p.post_excerpt || '',
    content: p.post_content,
    authorId: p.post_author,
    featuredImageId: thumb && attachmentById.has(thumb) ? thumb : null,
    featuredImageDangling: thumb && !attachmentById.has(thumb) ? thumb : null,
    categoryIds: cats,
    tagIds: tg,
    primaryCategoryId: m['_yoast_wpseo_primary_category'] ? Number(m['_yoast_wpseo_primary_category']) : null,
    focusKeyword: m['_yoast_wpseo_focuskw'] || null,
    seoTitle: m['_yoast_wpseo_title'] || null,
    metaDescription: m['_yoast_wpseo_metadesc'] || null,
    canonical: m['_yoast_wpseo_canonical'] || null,
    commentStatus: p.comment_status,
    wpParent: p.post_parent || null,
    legacyUrl: `${SITE_URL}/?p=${p.ID}`,
  };
}

const publishedPosts = posts.filter((p) => p.post_type === 'post' && p.post_status === 'publish').map(baseRecord);
const publishedPages = posts.filter((p) => p.post_type === 'page' && p.post_status === 'publish').map(baseRecord);
const draftRows = posts.filter((p) => p.post_type === 'post' && ['draft', 'auto-draft'].includes(p.post_status)).map(baseRecord);

// Published posts claim their slugs first; drafts are assigned afterwards so a draft can never take a
// published article's slug (drafts have no public URL, a collision there is harmless but we avoid it).
const postSlugs = assignUniqueSlugs(publishedPosts.map((r) => ({ id: r.id, title: r.title, sourceSlug: r.sourceSlug })));
{
  const used = new Set([...postSlugs.values()].map((v) => v.slug));
  for (const d of draftRows.filter((d) => d.status === 'draft').sort((a, b) => a.id - b.id)) {
    let slug = d.sourceSlug.length >= WP_SLUG_TRUNCATED_AT ? '' : decodeSlug(d.sourceSlug || '');
    if (!slug) slug = slugifyFallback(d.title, d.id);
    let collided = false;
    if (used.has(slug)) { slug = `${slug}-${d.id}`; collided = true; }
    used.add(slug);
    postSlugs.set(d.id, { slug, sourceSlug: d.sourceSlug, collided });
  }
}
const pageSlugs = assignUniqueSlugs(publishedPages.map((r) => ({ id: r.id, title: r.title, sourceSlug: r.sourceSlug })));
for (const r of publishedPosts) Object.assign(r, { _id: `post-${r.id}`, ...pick(postSlugs.get(r.id)) });
for (const r of publishedPages) Object.assign(r, { _id: `page-${r.id}`, ...pick(pageSlugs.get(r.id)) });
function pick(s) {
  return { slug: s.slug, slugCollided: s.collided };
}

// published-post classification
for (const r of publishedPosts) {
  r.contentClass = r.content.trim() === '' ? 'empty-body' : r.content.includes('<!-- wp:') ? 'gutenberg' : 'legacy-html';
  r.imageLed = r.contentClass === 'empty-body' && !!r.featuredImageId;
}

// draft classification
const draftBuckets = [];
for (const d of draftRows) {
  let bucket;
  const text = d.content.replace(/<!--[\s\S]*?-->|<[^>]+>/g, '').trim();
  if (d.status === 'auto-draft') bucket = 'auto-draft-archive-only';
  else if (text.length >= 100) bucket = 'recoverable-draft-with-content';
  else if (text.length > 0 || d.title.trim()) bucket = d.featuredImageId ? 'recoverable-draft-image-led' : text.length > 0 ? 'recoverable-draft-fragment' : 'draft-title-only';
  else bucket = 'draft-empty';
  draftBuckets.push({ ...d, bucket });
}
// Policy: all 19 real drafts are kept as Sanity drafts (drafts.post-<id>) — they are private and cheap
// to keep. The auto-draft is WordPress scaffolding with no content: archived in the manifest only.
for (const d of draftBuckets) {
  if (d.status === 'auto-draft') continue;
  Object.assign(d, { _id: `post-${d.id}`, ...pick(postSlugs.get(d.id)) });
  d.importAs = 'sanity-draft';
}
for (const d of draftBuckets) if (d.status === 'auto-draft') d.importAs = 'archive-only';

// ---------- menus ----------
const navItems = posts.filter((p) => p.post_type === 'nav_menu_item');
const menuTerms = taxonomy.filter((t) => t.taxonomy === 'nav_menu');
const themeMods = options['theme_mods_adore-news'] ? safeUnserialize(options['theme_mods_adore-news']) : {};
const menuLocations = themeMods?.nav_menu_locations || {};
const menus = menuTerms.map((tt) => {
  const t = termById.get(tt.term_id);
  const items = navItems
    .filter((n) => (relsByObj.get(n.ID) || []).includes(tt.term_taxonomy_id))
    .sort((a, b) => a.menu_order - b.menu_order)
    .map((n) => {
      const m = meta(n.ID);
      const type = m._menu_item_type;
      const objId = Number(m._menu_item_object_id);
      const base = { wpId: n.ID, order: n.menu_order, parentWpId: Number(m._menu_item_menu_item_parent) || null, type };
      if (type === 'taxonomy') {
        const term = termById.get(objId);
        return { ...base, label: n.post_title || term?.name || '', object: m._menu_item_object, objectId: objId };
      }
      if (type === 'custom') return { ...base, label: n.post_title, url: m._menu_item_url };
      return { ...base, label: n.post_title, object: m._menu_item_object, objectId: objId };
    });
  const location = Object.entries(menuLocations).find(([, v]) => Number(v) === tt.term_id)?.[0] || null;
  return { id: tt.term_id, _id: `menu-${tt.term_id}`, title: t.name, slug: t.slug, location, items };
});

// ---------- site settings ----------
const headerScripts = (options.ihaf_insert_header || '').replace(/\\"/g, '"');
const adsenseMatch = headerScripts.match(/client=(ca-pub-\d+)/);
const site = {
  _id: 'siteSettings',
  title: options.blogname,
  tagline: options.blogdescription,
  siteUrl: options.siteurl,
  activeTheme: options.current_theme,
  language: 'mr',
  postsPerPage: Number(options.posts_per_page) || 10,
  permalinkStructure: options.permalink_structure || '(plain: ?p=ID)',
  siteIconAttachmentId: Number(options.site_icon) || null,
  headerImageAttachmentId: themeMods?.header_image_data?.attachment_id ?? null,
  adsensePublisherId: adsenseMatch ? adsenseMatch[1] : null,
  bannerPostIds: ['adore_news_banner_post_1', 'adore_news_banner_post_2', 'adore_news_banner_post_3', 'adore_news_banner_post_4', 'adore_news_banner_post_5']
    .map((k) => Number(themeMods?.[k]))
    .filter(Boolean),
  bannerSectionEnabled: !!themeMods?.adore_news_banner_section_enable,
  breakingNewsEnabled: !!themeMods?.adore_news_breaking_news_section_enable,
  activePlugins: Object.values(safeUnserialize(options.active_plugins) || {}),
  jetpackModules: Object.values(safeUnserialize(options.jetpack_active_modules) || {}),
  socialLinks: (menus.find((m) => m.location === 'social')?.items || []).map((i) => ({ label: i.label, url: i.url })),
};

// ---------- comments archive (not migrated) ----------
const commentStats = {
  total: comments.length,
  byApproved: comments.reduce((a, c) => ((a[c.comment_approved] = (a[c.comment_approved] || 0) + 1), a), {}),
  byPostStatus: comments.reduce((a, c) => {
    const p = postById.get(c.comment_post_ID);
    const k = p ? `${p.post_type}/${p.post_status}` : 'missing-parent';
    a[k] = (a[k] || 0) + 1;
    return a;
  }, {}),
};
// Archive the full comments (contains PII: names, e-mails, IPs). Gitignored work dir only.
write('comments-archive.json', comments);

// ---------- revisions ----------
const revisions = posts
  .filter((p) => p.post_type === 'revision')
  .map((p) => ({ id: p.ID, parent: p.post_parent, parentType: postById.get(p.post_parent)?.post_type ?? 'missing', parentStatus: postById.get(p.post_parent)?.post_status ?? null, chars: p.post_content.length, modifiedAt: iso(p.post_modified_gmt) }));

// ---------- orphan media inventory ----------
const known = new Set();
for (const a of attachments) for (const f of a.knownFiles) known.add(f);
const IGNORE = /(^|\/)(\.htaccess|index\.(php|html)|\.DS_Store)$/;
const orphanFiles = [];
(function walk(dir, rel = '') {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) walk(path.join(dir, e.name), r);
    else if (!IGNORE.test(r) && !known.has(r)) orphanFiles.push({ path: r, bytes: fs.statSync(path.join(dir, e.name)).size });
  }
})(UPLOADS);
let totalFiles = 0;
(function count(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) e.isDirectory() ? count(path.join(dir, e.name)) : totalFiles++;
})(UPLOADS);

// ---------- reconciliation ----------
const classified = new Map();
const mark = (ids, bucket) => ids.forEach((id) => {
  if (classified.has(id)) throw new Error(`ID ${id} classified twice: ${classified.get(id)} and ${bucket}`);
  classified.set(id, bucket);
});
mark(publishedPosts.map((r) => r.id), 'post:publish');
mark(publishedPages.map((r) => r.id), 'page:publish');
mark(draftBuckets.map((r) => r.id), 'post:draft');
mark(attachments.map((r) => r.id), 'attachment');
mark(revisions.map((r) => r.id), 'revision');
mark(navItems.map((p) => p.ID), 'nav_menu_item');
const other = posts.filter((p) => !classified.has(p.ID));
mark(other.map((p) => p.ID), 'other-system');
const reconciliation = {
  generatedFrom: 'migration/work/raw (APP-DATA.SQL)',
  wpPostsRows: posts.length,
  classifiedIds: classified.size,
  unclassified: posts.length - classified.size,
  buckets: [...classified.values()].reduce((a, b) => ((a[b] = (a[b] || 0) + 1), a), {}),
  otherSystemPosts: other.map((p) => ({ id: p.ID, type: p.post_type, status: p.post_status, title: p.post_title.slice(0, 60) })),
  publishedPosts: publishedPosts.length,
  publishedPages: publishedPages.length,
  imageLedPosts: publishedPosts.filter((r) => r.imageLed).length,
  emptyBodyPosts: publishedPosts.filter((r) => r.contentClass === 'empty-body').length,
  emptyBodyWithoutFeaturedImage: publishedPosts.filter((r) => r.contentClass === 'empty-body' && !r.featuredImageId).map((r) => r.id),
  gutenbergPosts: publishedPosts.filter((r) => r.contentClass === 'gutenberg').length,
  legacyHtmlPosts: publishedPosts.filter((r) => r.contentClass === 'legacy-html').length,
  drafts: draftBuckets.reduce((a, d) => ((a[d.bucket] = (a[d.bucket] || 0) + 1), a), {}),
  categories: categories.length,
  tags: tags.length,
  authors: authors.length,
  attachments: attachments.length,
  attachmentsWithLocalFile: attachments.filter((a) => a.localFileExists).length,
  attachmentsMissingLocalFile: attachments.filter((a) => !a.localFileExists).map((a) => a.id),
  featuredImageDangling: [...publishedPosts, ...publishedPages, ...draftBuckets].filter((r) => r.featuredImageDangling).map((r) => r.id),
  revisions: revisions.length,
  revisionsByParent: revisions.reduce((a, r) => ((a[r.parentType] = (a[r.parentType] || 0) + 1), a), {}),
  comments: commentStats,
  menus: menus.map((m) => ({ id: m.id, title: m.title, location: m.location, items: m.items.length })),
  uploads: { totalFiles, knownAttachmentFiles: known.size, orphanFiles: orphanFiles.length, orphanBytes: orphanFiles.reduce((s, f) => s + f.bytes, 0) },
  slugCollisions: [...publishedPosts, ...publishedPages, ...draftBuckets, ...categories, ...tags].filter((r) => r.slugCollided).map((r) => ({ id: r.id, slug: r.slug })),
};

write('authors.json', authors);
write('categories.json', categories);
write('tags.json', tags);
write('posts.json', publishedPosts);
write('pages.json', publishedPages);
write('drafts.json', draftBuckets);
write('attachments.json', attachments);
write('menus.json', menus);
write('site.json', site);
write('revisions.json', revisions);
write('orphan-media.json', orphanFiles);
write('reconciliation.json', reconciliation);
console.log(JSON.stringify(reconciliation, null, 2));
