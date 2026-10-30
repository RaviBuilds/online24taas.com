import re
p='/home/ravi/Projects/freelancing/online24taas-web/scripts/transform-pt.mjs'
s=open(p).read()
old_start=s.index('function parseInline(text) {')
old_end=s.index('let _k = 0;')
new_func='''function parseInline(html) {
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
    if (/^<br\\b/i.test(tok)) { textBuf += '\\n'; continue; }
    if (/^<(strong|b)(\\s|>)/i.test(tok)) { flushText(); stack.push('strong'); }
    else if (/^<(em|i)(\\s|>)/i.test(tok)) { flushText(); stack.push('em'); }
    else if (/^<u(\\s|>)/i.test(tok)) { flushText(); stack.push('underline'); }
    else if (/^<a\\s/i.test(tok)) {
      flushText();
      const hrefM = tok.match(/href=["']([^"']+)["']/i);
      const href = hrefM ? hrefM[1] : '';
      const key = 'link_' + markDefs.length;
      markDefs.push({ _type: 'link', _key: key, href });
      stack.push(key);
    }
    else if (/^<\\/(strong|b)>/i.test(tok)) { flushText(); removeLast('strong'); }
    else if (/^<\\/(em|i)>/i.test(tok)) { flushText(); removeLast('em'); }
    else if (/^<\\/u>/i.test(tok)) { flushText(); removeLast('underline'); }
    else if (/^<\\/a>/i.test(tok)) {
      flushText();
      for (let i = stack.length - 1; i >= 0; i--) { if (String(stack[i]).startsWith('link_')) { stack.splice(i, 1); break; } }
    }
  }
  flushText();
  if (children.length === 0) children.push({ _type: 'span', _key: k(), text: '', marks: [] });
  parseInline._lastMarkDefs = markDefs;
  return children;
}
'''
s = s[:old_start] + new_func + s[old_end:]
# update block() to use markDefs
s = s.replace("  return { _type: 'block', _key: k(), style, markDefs: [], children: parseInline(text), ...extra };",
              "  const children = parseInline(html);\n  const md = parseInline._lastMarkDefs || []; parseInline._lastMarkDefs = [];\n  return { _type: 'block', _key: k(), style, markDefs: md, children, ...extra };")
# rename block signature param
s = s.replace("function block(style, text, extra = {}) {", "function block(style, html, extra = {}) {")
open(p,'w').write(s)
print('done')
