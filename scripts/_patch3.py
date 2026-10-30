import re
p='/home/ravi/Projects/freelancing/online24taas-web/scripts/transform-pt.mjs'
s=open(p).read()
old='''function transformLegacyHtml(content) {
  const blocks = [];
  // Split on block-level boundaries; convert <p>, headings, <li>, keep <img>.
  const pieces = content.split(/(?:<\\/(p|h[1-6]|li|div)>)/i);
  for (const piece of pieces) {
    if (!piece) continue;
    if (/<img/i.test(piece)) {
      const img = imageFromHtml(piece);
      if (img.src) { blocks.push({ _type: 'image', _key: k(), wpAttachmentId: img.wpAttachmentId, src: img.src, alt: img.alt, caption: img.caption, _needsAsset: true, _fromLegacy: true }); continue; }
    }
    const t = htmlToText(piece);
    if (!t) continue;
    let style = 'normal';
    const h = piece.match(/<h([1-6])/i);
    if (h) style = 'h' + h[1];
    blocks.push(block(style, t));
  }
  return blocks;
}'''
new='''function transformLegacyHtml(content) {
  const blocks = [];
  // headings
  for (const m of content.matchAll(/<h([1-6])[^>]*>([\\s\\S]*?)<\\/h\\1>/gi)) {
    const t = htmlToText(m[2]);
    if (t) blocks.push(block('h' + m[1], m[2]));
  }
  // lists: one block per li
  for (const lm of content.matchAll(/<(ul|ol)[^>]*>([\\s\\S]*?)<\\/\\1>/gi)) {
    const isOrdered = lm[1].toLowerCase() === 'ol';
    for (const li of lm[2].matchAll(/<li[^>]*>([\\s\\S]*?)<\\/li>/gi)) {
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
  for (const pm of content.matchAll(/<p[^>]*>([\\s\\S]*?)<\\/p>/gi)) {
    const t = htmlToText(pm[1]);
    if (t) blocks.push(block('normal', pm[1]));
  }
  if (blocks.length === 0) {
    content.split(/\\n{2,}/).forEach((chunk) => { const t = htmlToText(chunk); if (t) blocks.push(block('normal', chunk)); });
  }
  return blocks;
}'''
assert old in s
s=s.replace(old,new)
open(p,'w').write(s)
print('done')
