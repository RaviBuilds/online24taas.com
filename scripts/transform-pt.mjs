// transform-pt.mjs — Gutenberg + legacy-HTML -> Sanity Portable Text (dependency-free).
// Preserves Marathi verbatim. Never silently drops content: unknown blocks are captured
// into a rawHtml block and logged. Image blocks keep the WP attachment id for later asset mapping.
import fs from 'node:fs';
import path from 'node:path';

const UNMAPPED_LOG = '/tmp/online24taas-work/migration/unmapped-blocks.ndjson';
const unmapped = [];

// Decode the small set of HTML entities we actually encounter; leave everything else intact.
function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// Strip tags to plain text for paragraph/heading/li content, but keep inline marks we care about.
function htmlToText(html) {
  // Preserve <strong>/<b>, <em>/<i>, <u> as markdown-ish markers, then strip other tags.
  let s = html;
  s = s.replace(/<(strong|b)(\s[^>]*)?>/gi, '**').replace(/<\/(strong|b)>/gi, '**');
  s = s.replace(/<(em|i)(\s[^>]*)?>/gi, '_').replace(/<\/(em|i)>/gi, '_');
  s = s.replace(/<u(\s[^>]*)?>/gi, '').replace(/<\/u>/gi, '');
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<[^>]+>/g, ''); // drop remaining tags
  s = decodeEntities(s);
  return s.trim();
}

function parseInline(html) {
  const tokens = String(html).match(/<[^>]+>|[^<]+/g) || [];
  const children = [];
  const stack = [];
  let textBuf = '';
  let markDefs = [];
  function flushText() {
    if (textBuf === '') return;
    children.push({ _type: 'span', _key: k(), text: decodeEntities(textBuf), marks: stack.slice() });
    textBuf = '';
  }
  function removeLast(val) {
    for (let i = stack.length - 1; i >= 0; i--) { if (stack[i] === val) { stack.splice(i, 1); return; } }
  }
  for (const tok of tokens) {
    if (!tok.startsWith('<')) { textBuf += tok; continue; }
    if (/^<br\b/i.test(tok)) { textBuf += '\n'; continue; }
    if (/^<(strong|b)(\s|>)/i.test(tok)) { flushText(); stack.push('strong'); }
    else if (/^<(em|i)(\s|>)/i.test(tok)) { flushText(); stack.push('em'); }
    else if (/^<u(\s|>)/i.test(tok)) { flushText(); stack.push('underline'); }
    else if (/^<a\s/i.test(tok)) {
      flushText();
      const hrefM = tok.match(/href=["']([^"']+)["']/i);
      const href = hrefM ? hrefM[1] : '';
      const key = 'link_' + markDefs.length;
      markDefs.push({ _type: 'link', _key: key, href });
      stack.push(key);
    }
    else if (/^<\/(strong|b)>/i.test(tok)) { flushText(); removeLast('strong'); }
    else if (/^<\/(em|i)>/i.test(tok)) { flushText(); removeLast('em'); }
    else if (/^<\/u>/i.test(tok)) { flushText(); removeLast('underline'); }
    else if (/^<\/a>/i.test(tok)) {
      flushText();
      for (let i = stack.length - 1; i >= 0; i--) { if (String(stack[i]).startsWith('link_')) { stack.splice(i, 1); break; } }
    }
  }
  flushText();
  if (children.length === 0) children.push({ _type: 'span', _key: k(), text: '', marks: [] });
  parseInline._lastMarkDefs = markDefs;
  return children;
}
let _k = 0; const k = () => 'k' + (_k++).toString(36) + Math.random().toString(36).slice(2, 6);

function block(style, html, extra = {}) {
  const children = parseInline(html);
  const md = parseInline._lastMarkDefs || []; parseInline._lastMarkDefs = [];
  return { _type: 'block', _key: k(), style, markDefs: md, children, ...extra };
}

// Extract image info (attachment id + alt + caption) from a wp:image inner HTML.
function imageFromHtml(innerHtml) {
  const idMatch = innerHtml.match(/wp-image-(\d+)/) || innerHtml.match(/\"id\":(\d+)/);
  const srcMatch = innerHtml.match(/src=\"([^\"]+)\"/);
  const altMatch = innerHtml.match(/alt=\"([^\"]*)\"/);
  const capMatch = innerHtml.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/);
  return {
    wpAttachmentId: idMatch ? Number(idMatch[1]) : null,
    src: srcMatch ? srcMatch[1] : null,
    alt: altMatch ? decodeEntities(altMatch[1]) : '',
    caption: capMatch ? htmlToText(capMatch[1]) : '',
  };
}

// ---- Gutenberg transform ----
function transformGutenberg(content) {
  const blocks = [];
  const re = /<!--\s+wp:([a-z0-9\/\-]+)(\s*\{[\s\S]*?\})?\s*(-->|\/-->)/g;
  const openers = [];
  let m;
  while ((m = re.exec(content)) !== null) {
    if (m[3] === '/-->') continue; // closer
    openers.push({ name: m[1], index: m.index, json: m[2], after: re.lastIndex });
  }
  for (let i = 0; i < openers.length; i++) {
    const o = openers[i];
    const closer = content.indexOf('<!-- /wp:' + o.name + ' -->', o.after);
    const inner = closer >= 0 ? content.slice(o.after, closer) : content.slice(o.after);
    const name = o.name;
    if (name === 'paragraph') {
      const t = htmlToText(inner);
      if (t) blocks.push(block('normal', inner));
    } else if (name === 'heading') {
      const lvl = (o.json && (o.json.match(/\"level\":(\d)/) || [])[1]) || '2';
      const t = htmlToText(inner);
      if (t) blocks.push(block('h' + lvl, inner));
    } else if (name === 'list') {
      const liMatches = [...inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
      const items = liMatches.length ? liMatches.map((m) => m[1]) : [inner];
      const isOrdered = /<ol/i.test(inner);
      const listItem = isOrdered ? 'number' : 'bullet';
      items.forEach((html) => {
        const t = htmlToText(html);
        if (!t) return;
        const children = parseInline(html);
        const md = parseInline._lastMarkDefs || []; parseInline._lastMarkDefs = [];
        blocks.push({ _type: 'block', _key: k(), style: 'normal', listItem, level: 1, markDefs: md, children });
      });
    } else if (name === 'list-item') {
      const t = htmlToText(inner);
      if (t) {
        const children = parseInline(inner);
        const md = parseInline._lastMarkDefs || []; parseInline._lastMarkDefs = [];
        blocks.push({ _type: 'block', _key: k(), style: 'normal', listItem: 'bullet', level: 1, markDefs: md, children });
      }
    } else if (name === 'image') {
      const img = imageFromHtml(inner);
      blocks.push({ _type: 'image', _key: k(), wpAttachmentId: img.wpAttachmentId, src: img.src, alt: img.alt, caption: img.caption, _needsAsset: true });
    } else if (name === 'html') {
      blocks.push({ _type: 'rawHtml', _key: k(), html: inner.trim() });
    } else if (name === 'code') {
      blocks.push({ _type: 'block', _key: k(), style: 'normal', markDefs: [], children: parseInline(htmlToText(inner)), _code: true });
    } else if (name === 'gallery') {
      // Nested images: pull each wp:image inside, plus keep raw for fallback.
      const imgs = [...inner.matchAll(/<!--\s+wp:image[\s\S]*?-->([\s\S]*?)<!--\s+\/wp:image\s*-->/g)];
      imgs.forEach((im) => { const gi = imageFromHtml(im[1]); blocks.push({ _type: 'image', _key: k(), wpAttachmentId: gi.wpAttachmentId, src: gi.src, alt: gi.alt, caption: gi.caption, _needsAsset: true, _fromGallery: true }); });
      unmapped.push({ block: 'wp:gallery', note: 'nested images extracted; layout grouping lost', images: imgs.length });
    } else {
      // Unknown block: preserve verbatim, never drop.
      const t = htmlToText(inner);
      blocks.push({ _type: 'rawHtml', _key: k(), blockName: 'wp:' + name, html: inner.trim(), text: t });
      unmapped.push({ block: 'wp:' + name, note: 'preserved as rawHtml', sample: t.slice(0, 80) });
    }
  }
  // Top-level text NOT inside any block (legacy posts with no blocks) -> paragraphs.
  if (openers.length === 0) {
    content.split(/\n{2,}|<br\s*\/?>/i).forEach((chunk) => { const t = htmlToText(chunk); if (t) blocks.push(block('normal', chunk)); });
  }
  return blocks;
}

// ---- Legacy HTML transform (no wp: blocks) ----
function transformLegacyHtml(content) {
  const blocks = [];
  // headings
  for (const m of content.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const t = htmlToText(m[2]);
    if (t) blocks.push(block('h' + m[1], m[2]));
  }
  // lists: one block per li
  for (const lm of content.matchAll(/<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const isOrdered = lm[1].toLowerCase() === 'ol';
    for (const li of lm[2].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
      const t = htmlToText(li[1]);
      if (!t) continue;
      const children = parseInline(li[1]);
      const md = parseInline._lastMarkDefs || []; parseInline._lastMarkDefs = [];
      blocks.push({ _type: 'block', _key: k(), style: 'normal', listItem: isOrdered ? 'number' : 'bullet', level: 1, markDefs: md, children });
    }
  }
  // images
  for (const im of content.matchAll(/<img[^>]*>/gi)) {
    const img = imageFromHtml(im[0]);
    if (img.src) blocks.push({ _type: 'image', _key: k(), wpAttachmentId: img.wpAttachmentId, src: img.src, alt: img.alt, caption: img.caption, _needsAsset: true, _fromLegacy: true });
  }
  // paragraphs
  for (const pm of content.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const t = htmlToText(pm[1]);
    if (t) blocks.push(block('normal', pm[1]));
  }
  if (blocks.length === 0) {
    content.split(/\n{2,}/).forEach((chunk) => { const t = htmlToText(chunk); if (t) blocks.push(block('normal', chunk)); });
  }
  return blocks;
}

export function transform(content) {
  if (typeof content !== 'string' || !content.trim()) return { blocks: [], sourceFormat: 'empty' };
  const isGuten = content.indexOf('<!-- wp:') >= 0;
  const blocks = isGuten ? transformGutenberg(content) : transformLegacyHtml(content);
  return { blocks, sourceFormat: isGuten ? 'gutenberg' : 'legacy-html' };
}

export function flushUnmapped(outPath = UNMAPPED_LOG) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.appendFileSync(outPath, unmapped.map((u) => JSON.stringify(u)).join('\n') + (unmapped.length ? '\n' : ''));
  return unmapped.length;
}

// CLI: transform a file of entities and print a summary.
if (import.meta.url === `file://${process.argv[1]}`) {
  const infile = process.argv[2];
  const data = JSON.parse(fs.readFileSync(infile, 'utf8'));
  let total = 0, imgs = 0, devanagari = 0;
  for (const e of data) {
    const r = transform(e.content);
    total += r.blocks.length;
    imgs += r.blocks.filter((b) => b._type === 'image').length;
    const txt = JSON.stringify(r.blocks);
    if (/[\u0900-\u097F]/.test(txt)) devanagari++;
  }
  console.log(`file=${infile} entities=${data.length} totalBlocks=${total} imageBlocks=${imgs} entitiesWithDevanagari=${devanagari}`);
}
