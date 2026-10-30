/** "कोल्हापूर पाणी" -> "कोल्हापूर* पाणी*" : each term becomes a prefix match. */
export function toMatchQuery(q: string): string {
  return q
    .normalize('NFC')
    .replace(/[*"'\\()[\]{}:|&!~^]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8)
    .map((t) => `${t}*`)
    .join(' ');
}

