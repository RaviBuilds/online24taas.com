// WordPress (Gutenberg / classic) HTML -> Sanity Portable Text.
//
// Gutenberg's saved markup is plain HTML wrapped in <!-- wp:... --> comments, so we drop the comments
// and walk a real DOM (parse5) instead of regex-slicing. Anything we cannot represent faithfully is
// preserved as a `rawHtml` block (sanitised at render time) and logged in `diagnostics` — never
// silently dropped.
//
// Deterministic keys: block/span/markDef keys are derived from position, so re-running the transform
// on the same input yields byte-identical output (needed for idempotent imports).
import { parseFragment, serializeOuter } from 'parse5';

const INLINE = new Set(['a', 'abbr', 'b', 'bdi', 'cite', 'code', 'del', 'dfn', 'em', 'i', 'ins', 'kbd', 'mark', 'q', 's', 'samp', 'small', 'span', 'strike', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'br', 'wbr', 'font', 'big', 'tt']);
const DECORATORS = {
  strong: 'strong', b: 'strong',
  em: 'em', i: 'em', cite: 'em', dfn: 'em',
  u: 'underline', ins: 'underline',
  s: 'strike-through', strike: 'strike-through', del: 'strike-through',
  code: 'code', kbd: 'code', samp: 'code', tt: 'code',
  sup: 'sup', sub: 'sub',
};
const HEADINGS = { h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h4', h5: 'h5', h6: 'h6' };
const WP_COLOR_CLASS = /has-([a-z0-9-]+)-color/;
const SKIP_ELEMENTS = new Set(['script', 'style', 'noscript', 'template']);

const attr = (el, name) => el.attrs?.find((a) => a.name === name)?.value;
const isEl = (n) => n && n.nodeName && !n.nodeName.startsWith('#');
const children = (n) => n.childNodes || n.content?.childNodes || [];

function descendants(node, pred, acc = []) {
  for (const c of children(node)) {
    if (pred(c)) acc.push(c);
    descendants(c, pred, acc);
  }
  return acc;
}
const textOf = (node) =>
  children(node)
    .map((c) => (c.nodeName === '#text' ? c.value : isEl(c) ? (c.nodeName === 'br' ? '\n' : textOf(c)) : ''))
    .join('');

export function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

/**
 * @param {string} content raw post_content
 * @param {object} ctx { resolveImage(info) -> {attachmentId}|null, rewriteHref(href) -> string, keyPrefix }
 * @returns {{blocks: object[], diagnostics: object}}
 */
export function htmlToPortableText(content, ctx = {}) {
  const diag = {
    rawHtmlBlocks: [], // { reason, tag }
    droppedAttributes: {}, // "tag.attr" -> count
    unresolvedImages: [],
    linkedImages: 0,
    emptyImagePlaceholders: 0,
    alignedBlocks: {},
    colorMarks: 0,
  };
  const bump = (m, k) => (m[k] = (m[k] || 0) + 1);
  const blocks = [];
  let blockCounter = 0;
  const bkey = () => `b${blockCounter++}`;

  const resolveImage = ctx.resolveImage || (() => null);
  const rewriteHref = ctx.rewriteHref || ((h) => h);

  // ---------- inline ----------
  function inlineToChildren(nodes) {
    const markDefs = [];
    const spans = [];
    const defKeyFor = new Map();
    let spanCounter = 0;
    const push = (text, marks) => {
      if (!text) return;
      const last = spans[spans.length - 1];
      if (last && last.marks.join('|') === marks.join('|')) last.text += text;
      else spans.push({ _type: 'span', text, marks: [...marks] });
    };
    function walk(list, marks) {
      for (const n of list) {
        if (n.nodeName === '#text') {
          push(n.value.replace(/[\t\r\n\u00a0 ]+/g, ' '), marks);
        } else if (isEl(n)) {
          const tag = n.nodeName;
          if (SKIP_ELEMENTS.has(tag)) continue;
          if (tag === 'br') {
            push('\n', marks);
            continue;
          }
          if (tag === 'wbr') continue;
          if (tag === 'img') continue; // handled at block level
          let nextMarks = marks;
          if (DECORATORS[tag]) nextMarks = [...marks, DECORATORS[tag]];
          else if (tag === 'a') {
            const hrefRaw = attr(n, 'href');
            if (hrefRaw) {
              const href = rewriteHref(hrefRaw.trim());
              const sig = href;
              let key = defKeyFor.get(sig);
              if (!key) {
                key = `l${markDefs.length}`;
                const def = { _type: 'link', _key: key, href };
                if (attr(n, 'target') === '_blank') def.blank = true;
                markDefs.push(def);
                defKeyFor.set(sig, key);
              }
              nextMarks = [...marks, key];
            }
          } else if (tag === 'mark' || tag === 'span' || tag === 'font') {
            const cls = attr(n, 'class') || '';
            const m = cls.match(WP_COLOR_CLASS);
            if (m && tag === 'mark') {
              const sig = `color:${m[1]}`;
              let key = defKeyFor.get(sig);
              if (!key) {
                key = `c${markDefs.length}`;
                markDefs.push({ _type: 'textColor', _key: key, color: m[1] });
                defKeyFor.set(sig, key);
              }
              nextMarks = [...marks, key];
              diag.colorMarks++;
            } else if (tag === 'mark') {
              nextMarks = [...marks, 'highlight'];
            }
            if (attr(n, 'style') && tag !== 'mark') bump(diag.droppedAttributes, `${tag}.style`);
          } else if (!INLINE.has(tag)) {
            // block element inside inline context: flatten its text, keep going
          }
          walk(children(n), nextMarks);
        }
      }
    }
    walk(nodes, []);
    // trim whitespace at the ends of the paragraph and around hard breaks
    if (spans.length) {
      spans[0].text = spans[0].text.replace(/^[ \n]+/, '');
      const l = spans[spans.length - 1];
      l.text = l.text.replace(/[ \n]+$/, '');
    }
    for (const s of spans) s.text = s.text.replace(/ ?\n ?/g, '\n');
    const kept = spans.filter((s) => s.text !== '');
    const used = new Set(kept.flatMap((s) => s.marks));
    return {
      spans: kept.map((s, i) => ({ ...s, _key: `s${i}` })),
      markDefs: markDefs.filter((d) => used.has(d._key)),
    };
  }

  function emitTextBlock(nodes, { style = 'normal', listItem, level } = {}, el) {
    const { spans, markDefs } = inlineToChildren(nodes);
    if (!spans.length) return false;
    const b = { _type: 'block', _key: bkey(), style, markDefs, children: spans };
    if (listItem) Object.assign(b, { listItem, level });
    if (el) {
      const cls = attr(el, 'class') || '';
      const al = cls.match(/has-text-align-(center|right|justify)/);
      if (al) {
        // centred plain paragraphs map to the dedicated 'center' style; other alignments are only logged
        if (al[1] === 'center' && style === 'normal' && !listItem) b.style = 'center';
        else bump(diag.alignedBlocks, al[1]);
      }
    }
    // re-key children under the block key for global uniqueness within the document
    b.children = b.children.map((c, i) => ({ ...c, _key: `${b._key}s${i}` }));
    const remap = new Map();
    b.markDefs = b.markDefs.map((d, i) => {
      const nk = `${b._key}m${i}`;
      remap.set(d._key, nk);
      return { ...d, _key: nk };
    });
    b.children = b.children.map((c) => ({ ...c, marks: c.marks.map((m) => remap.get(m) || m) }));
    blocks.push(b);
    return true;
  }

  // ---------- images ----------
  function emitImage(img, figure, captionOverride) {
    const src = attr(img, 'src') || attr(img, 'data-src') || '';
    const cls = attr(img, 'class') || '';
    const idMatch = cls.match(/wp-image-(\d+)/);
    const info = { attachmentId: idMatch ? Number(idMatch[1]) : null, src };
    if (!src && !info.attachmentId) {
      // empty <img alt=""/> placeholder from the editor: nothing to preserve
      diag.emptyImagePlaceholders++;
      return;
    }
    const resolved = resolveImage(info);
    let caption = captionOverride;
    if (caption === undefined && figure) {
      const fc = children(figure).find((c) => c.nodeName === 'figcaption');
      caption = fc ? inlineToPlain(children(fc)) : '';
    }
    const b = { _type: 'image', _key: bkey(), alt: attr(img, 'alt') || '', caption: caption || '' };
    if (resolved) b.wpAttachmentId = resolved.attachmentId;
    else {
      b.sourceUrl = src;
      diag.unresolvedImages.push({ src, attachmentId: info.attachmentId });
    }
    blocks.push(b);
  }
  const inlineToPlain = (nodes) => inlineToChildren(nodes).spans.map((s) => s.text).join('').trim();

  // ---------- raw ----------
  function emitRaw(el, reason) {
    const html = serializeOuter(el).trim();
    blocks.push({ _type: 'rawHtml', _key: bkey(), html, blockName: el.nodeName, text: textOf(el).replace(/\s+/g, ' ').trim().slice(0, 200) });
    diag.rawHtmlBlocks.push({ reason, tag: el.nodeName });
  }

  // ---------- lists ----------
  function walkList(listEl, level) {
    const kind = listEl.nodeName === 'ol' ? 'number' : 'bullet';
    for (const li of children(listEl)) {
      if (!isEl(li) || li.nodeName !== 'li') continue;
      const inlineNodes = [];
      const nested = [];
      for (const c of children(li)) {
        if (isEl(c) && (c.nodeName === 'ul' || c.nodeName === 'ol')) nested.push(c);
        else inlineNodes.push(c);
      }
      emitTextBlock(inlineNodes, { listItem: kind, level }, li);
      for (const n of nested) walkList(n, level + 1);
    }
  }

  // ---------- flow ----------
  function walkFlow(nodes) {
    let pending = [];
    const flush = () => {
      if (pending.length) {
        emitTextBlock(pending);
        pending = [];
      }
    };
    for (const n of nodes) {
      if (n.nodeName === '#text') {
        pending.push(n);
        continue;
      }
      if (!isEl(n)) continue;
      const tag = n.nodeName;
      if (SKIP_ELEMENTS.has(tag)) {
        flush();
        if (tag === 'script' || tag === 'style') emitRaw(n, `unsupported:${tag}`);
        continue;
      }
      if (INLINE.has(tag)) {
        pending.push(n);
        continue;
      }
      flush();
      if (tag === 'p') {
        // paragraph that is only an image
        const imgs = descendants(n, (c) => c.nodeName === 'img');
        const textless = textOf(n).trim() === '';
        if (imgs.length && textless) imgs.forEach((im) => emitImage(im, null, ''));
        else {
          emitTextBlock(children(n), {}, n);
          imgs.forEach((im) => emitImage(im, null, ''));
        }
      } else if (HEADINGS[tag]) {
        emitTextBlock(children(n), { style: HEADINGS[tag] }, n);
      } else if (tag === 'ul' || tag === 'ol') {
        walkList(n, 1);
      } else if (tag === 'blockquote') {
        const inner = children(n).filter((c) => isEl(c) && c.nodeName === 'p');
        if (inner.length) inner.forEach((p) => emitTextBlock(children(p), { style: 'blockquote' }, p));
        else emitTextBlock(children(n), { style: 'blockquote' }, n);
      } else if (tag === 'figure') {
        const imgs = descendants(n, (c) => c.nodeName === 'img');
        const nestedFigs = children(n).filter((c) => isEl(c) && c.nodeName === 'figure');
        const other = descendants(n, (c) => ['iframe', 'video', 'audio', 'table', 'embed', 'object'].includes(c.nodeName));
        if (other.length) emitRaw(n, 'unsupported:figure-embed');
        else if (nestedFigs.length > 1 || imgs.length > 1) {
          // gallery: emit each nested figure; surface any gallery-level caption as a paragraph
          for (const c of children(n)) {
            if (isEl(c) && c.nodeName === 'figure') walkFlow([c]);
            else if (isEl(c) && c.nodeName === 'figcaption') emitTextBlock(children(c), {}, c);
          }
        } else if (imgs.length === 1) {
          if (descendants(n, (c) => c.nodeName === 'a').length) diag.linkedImages++;
          emitImage(imgs[0], n);
        } else if (nestedFigs.length === 1) walkFlow(children(n));
        else walkFlow(children(n));
      } else if (tag === 'img') {
        emitImage(n, null, '');
      } else if (tag === 'div' || tag === 'section' || tag === 'article' || tag === 'center' || tag === 'main' || tag === 'span') {
        walkFlow(children(n));
      } else if (tag === 'hr') {
        blocks.push({ _type: 'rawHtml', _key: bkey(), html: '<hr>', blockName: 'hr', text: '' });
      } else if (tag === 'figcaption') {
        emitTextBlock(children(n), {}, n);
      } else if (tag === 'pre') {
        emitTextBlock(children(n), { style: 'normal' }, n);
      } else {
        emitRaw(n, `unsupported:${tag}`);
      }
    }
    flush();
  }

  const html = stripComments(String(content || ''));
  if (html.trim()) walkFlow(children(parseFragment(html)));
  return { blocks, diagnostics: diag };
}

/** Plain text of a Portable Text array — used by tests to prove text survives the transform. */
export function portableTextToPlain(blocks) {
  return blocks
    .map((b) => {
      if (b._type === 'block') return b.children.map((c) => c.text).join('');
      if (b._type === 'image') return b.caption || '';
      if (b._type === 'rawHtml') return b.text || '';
      return '';
    })
    .join('\n');
}

/** Plain text of source HTML, normalised exactly like the transform normalises whitespace. */
export function htmlToComparablePlain(content) {
  const html = stripComments(String(content || ''));
  const frag = parseFragment(html);
  const text = (n) =>
    children(n)
      .map((c) => (c.nodeName === '#text' ? c.value : isEl(c) && !SKIP_ELEMENTS.has(c.nodeName) ? (c.nodeName === 'br' ? ' ' : text(c)) : ''))
      .join('');
  return text(frag).replace(/[\s\u00a0]+/g, '');
}
export function ptToComparablePlain(blocks) {
  return blocks
    .map((b) => {
      if (b._type === 'block') return b.children.map((c) => c.text).join('');
      if (b._type === 'image') return b.caption || '';
      if (b._type === 'rawHtml') return htmlToComparablePlain(b.html || '');
      return '';
    })
    .join('\n')
    .replace(/[\s\u00a0]+/g, '');
}
