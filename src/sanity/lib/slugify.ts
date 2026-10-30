// Sanity's default slugify strips every non-ASCII character, which would erase Marathi titles.
// This version keeps letters, combining marks (matras, virama) and digits from any script.
export function slugify(input: string, maxLength = 60): string {
  const words = String(input ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .split('-')
    .filter(Boolean);
  let out = '';
  for (const w of words) {
    const next = out ? `${out}-${w}` : w;
    if (next.length > maxLength && out) break;
    out = next.length > maxLength ? next.slice(0, maxLength) : next;
  }
  return out;
}
