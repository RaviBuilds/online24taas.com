const ALLOWED_TAGS = new Set([
  'p','br','strong','b','em','i','u','a','ul','ol','li','h1','h2','h3','h4','h5','h6',
  'img','figure','figcaption','blockquote','span',
]);
const VOID_TAGS = new Set(['br','img']);
const DROP_WITH_CONTENT = new Set(['script','style','iframe','object','embed','noscript','form','input','textarea','button']);
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href','title','target','rel']),
  img: new Set(['src','alt','title','width','height']),
  '*': new Set([]),
};
function escapeHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function isSafeUrl(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  if (v === '') return false;
  if (/^(javascript|vbscript|data|file):/i.test(v)) return false;
  if (v.startsWith('#') || v.startsWith('/') || v.startsWith('./') || v.startsWith('../')) return true;
  if (/^(https?:|mailto:|tel:)/i.test(v)) return true;
  if (v.startsWith('//')) return true;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return false;
  return true;
}
function sanitizeAttr(tag: string, name: string, value: string): string | null {
  const lower = name.toLowerCase();
  if (lower.startsWith('on')) return null;
  const allowed = ALLOWED_ATTRS[tag] || ALLOWED_ATTRS['*'];
  if (!allowed.has(lower)) return null;
  if (lower === 'href' || lower === 'src') {
    if (!isSafeUrl(value)) return null;
  }
  if (lower === 'target') {
    if (value !== '_blank' && value !== '_self') return null;
  }
  if (lower === 'rel') return null;
  return `${lower}="${escapeHtml(value)}"`;
}
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string' || input.trim() === '') return '';
  const out: string[] = [];
  const re = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>|([^<]+)|(<)/g;
  let m: RegExpExecArray | null;
  let dropDepth = 0;
  let dropTag: string | null = null;
  while ((m = re.exec(input)) !== null) {
    if (m[4] === '<') { out.push('&lt;'); continue; }
    if (m[3] !== undefined) {
      if (dropDepth > 0) continue;
      out.push(escapeHtml(m[3]));
      continue;
    }
    const tag = m[1].toLowerCase();
    const rest = m[2] || '';
    const isClose = m[0].startsWith('</');
    if (DROP_WITH_CONTENT.has(tag)) {
      if (isClose) { if (dropTag === tag) { dropTag = null; dropDepth = Math.max(0, dropDepth-1); } }
      else { dropTag = tag; dropDepth += 1; }
      continue;
    }
    if (dropDepth > 0) continue;
    if (isClose) {
      if (ALLOWED_TAGS.has(tag)) out.push(`</${tag}>`);
      continue;
    }
    if (!ALLOWED_TAGS.has(tag)) continue;
    const attrs: string[] = [];
    const attrRe = /([a-zA-Z_:][a-zA-Z0-9_:\-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let am: RegExpExecArray | null;
    while ((am = attrRe.exec(rest)) !== null) {
      const name = am[1];
      const value = am[2] ?? am[3] ?? am[4] ?? '';
      const sanitized = sanitizeAttr(tag, name, value);
      if (sanitized) attrs.push(sanitized);
    }
    if (tag === 'a' && attrs.some(a => a === 'target="_blank"')) {
      attrs.push('rel="noopener noreferrer"');
    }
    if (tag === 'img' && !attrs.some(a => a.startsWith('src='))) continue;
    const attrStr = attrs.length ? ' ' + attrs.join(' ') : '';
    out.push(`<${tag}${attrStr}>`);
  }
  return out.join('');
}
