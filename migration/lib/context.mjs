// Shared transform context built from normalized data: image resolution and internal-link rewriting.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const NORMALIZED = path.resolve(HERE, '../work/normalized');
export const loadNormalized = (name) => JSON.parse(fs.readFileSync(path.join(NORMALIZED, name + '.json'), 'utf8'));

const SITE_HOST = /^https?:\/\/(www\.)?online24taas\.com/i;

export function buildContext(data = {}) {
  const attachments = data.attachments || loadNormalized('attachments');
  const posts = data.posts || loadNormalized('posts');
  const pages = data.pages || loadNormalized('pages');
  const categories = data.categories || loadNormalized('categories');
  const tags = data.tags || loadNormalized('tags');

  const attById = new Map(attachments.map((a) => [a.id, a]));
  const byFile = new Map();
  for (const a of attachments) for (const f of a.knownFiles) if (!byFile.has(f)) byFile.set(f, a);
  const postById = new Map(posts.map((p) => [p.id, p]));
  const pageById = new Map(pages.map((p) => [p.id, p]));
  const catById = new Map(categories.map((c) => [c.id, c]));
  const tagBySlug = new Map(tags.flatMap((c) => [[c.sourceSlug, c], [c.slug, c]]));

  function uploadRel(src) {
    const m = String(src || '').match(/\/wp-content\/uploads\/(.+?)(?:[?#].*)?$/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function resolveImage({ attachmentId, src }) {
    if (attachmentId && attById.has(attachmentId)) return { attachmentId };
    const rel = uploadRel(src);
    if (!rel) return null;
    if (byFile.has(rel)) return { attachmentId: byFile.get(rel).id };
    // strip WordPress size suffix: name-300x200.ext -> name.ext, and -scaled
    const alt = rel.replace(/-\d+x\d+(\.[a-z0-9]+)$/i, '$1');
    if (byFile.has(alt)) return { attachmentId: byFile.get(alt).id };
    const alt2 = alt.replace(/(\.[a-z0-9]+)$/i, '-scaled$1');
    if (byFile.has(alt2)) return { attachmentId: byFile.get(alt2).id };
    return null;
  }

  function rewriteHref(href) {
    if (!SITE_HOST.test(href)) return href;
    let u;
    try {
      u = new URL(href);
    } catch {
      return href;
    }
    const q = u.searchParams;
    const p = q.get('p') || q.get('page_id');
    if (p && postById.has(Number(p))) return `/blog/${encodeURIComponent(postById.get(Number(p)).slug)}`;
    if (p && pageById.has(Number(p))) return `/${encodeURIComponent(pageById.get(Number(p)).slug)}`;
    const cat = q.get('cat');
    if (cat && catById.has(Number(cat))) return `/category/${encodeURIComponent(catById.get(Number(cat)).slug)}`;
    const tag = q.get('tag');
    if (tag && tagBySlug.has(tag)) return `/tag/${encodeURIComponent(tagBySlug.get(tag).slug)}`;
    if ((u.pathname === '/' || u.pathname === '') && ![...q.keys()].length) return '/';
    return href;
  }

  return { resolveImage, rewriteHref, attById, postById, pageById, uploadRel };
}
