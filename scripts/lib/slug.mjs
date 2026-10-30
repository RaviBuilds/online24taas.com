import { URL } from 'node:url';

export function decodeSlugOnce(value) {
  if (typeof value !== 'string') return value;
  if (!value.includes('%')) return value;
  // Validate by attempting decode; reject malformed.
  let out;
  try { out = decodeURIComponent(value); }
  catch (e) { throw new Error('MALFORMED_PERCENT_ENCODING:' + value); }
  // Ensure no leftover invalid sequences (decodeURIComponent throws on bad, but double-check round trip)
  if (out.includes('%') && /%[^0-9a-fA-F]/.test(out)) throw new Error('MALFORMED_PERCENT_ENCODING:' + value);
  return out;
}

export function normalizeSlug(value) {
  return decodeSlugOnce(String(value)).trim();
}

export function encodePathSegment(value) {
  return encodeURIComponent(value);
}

export function auditSlugs(records) {
  return records.map((r) => {
    const source = r.sourceSlug ?? r.slug ?? '';
    let normalized; let error = null;
    try { normalized = decodeSlugOnce(source); }
    catch (e) { error = e.message; normalized = source; }
    return { id: r.id, sourceSlug: source, normalizedSlug: normalized, changed: source !== normalized, error };
  });
}

export function detectCollisions(normalizedList) {
  const groups = {};
  for (const v of normalizedList) {
    (groups[v] = groups[v] || []).push(v);
  }
  return Object.entries(groups).filter(([, arr]) => arr.length > 1).map(([slug, arr]) => ({ slug, count: arr.length }));
}
