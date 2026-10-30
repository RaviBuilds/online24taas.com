// Slug helpers. WordPress stored Marathi slugs percent-encoded (lowercase %e0%a4...), truncated at
// 200 characters. We decode exactly once, normalize to NFC, and tolerate a truncated trailing escape.

export function decodeSlug(raw) {
  if (typeof raw !== 'string') return '';
  let s = raw.trim();
  if (!s.includes('%')) return s.normalize('NFC');
  // strict decode; on failure drop a dangling partial escape sequence at the end and retry
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return decodeURIComponent(s).normalize('NFC');
    } catch {
      // trim the last percent-escape group (an incomplete multi-byte character) and retry
      s = s.replace(/(%[0-9a-fA-F]{2}|%[0-9a-fA-F]?|%)$/, '');
      s = s.replace(/-$/, '');
    }
  }
  throw new Error('MALFORMED_PERCENT_ENCODING:' + raw);
}

/** Slug from a title, cut at a word boundary (never mid-word) to at most maxLen characters. */
export function slugifyFallback(title, id, maxLen = 60) {
  const words = String(title || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .split('-')
    .filter(Boolean);
  let out = '';
  for (const w of words) {
    const next = out ? `${out}-${w}` : w;
    if (next.length > maxLen && out) break;
    out = next.length > maxLen ? next.slice(0, maxLen) : next;
  }
  return out || String(id);
}

/** WordPress cut slugs at 200 percent-encoded characters; such slugs end mid-word. */
export const WP_SLUG_TRUNCATED_AT = 190;

/**
 * Assign unique slugs within a namespace. Records are processed in ascending id order so results are
 * deterministic. The first record keeps the decoded slug; later colliding ones get `-<id>` appended.
 * Returns Map(id -> {slug, sourceSlug, collided}).
 */
export function assignUniqueSlugs(records) {
  const out = new Map();
  const used = new Set();
  const sorted = [...records].sort((a, b) => a.id - b.id);
  for (const r of sorted) {
    const src = r.sourceSlug || '';
    // Truncated (mid-word) WP slugs are regenerated from the title at a word boundary.
    let slug = src.length >= WP_SLUG_TRUNCATED_AT ? '' : decodeSlug(src);
    if (!slug) slug = slugifyFallback(r.title, r.id);
    let collided = false;
    if (used.has(slug)) {
      slug = `${slug}-${r.id}`;
      collided = true;
    }
    used.add(slug);
    out.set(r.id, { slug, sourceSlug: r.sourceSlug || '', collided });
  }
  return out;
}

export function detectCollisions(slugs) {
  const seen = new Map();
  for (const s of slugs) seen.set(s, (seen.get(s) || 0) + 1);
  return [...seen].filter(([, n]) => n > 1).map(([slug, count]) => ({ slug, count }));
}

export const encodePathSegment = (s) => encodeURIComponent(s);
