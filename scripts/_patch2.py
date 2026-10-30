import re
p='/home/ravi/Projects/freelancing/online24taas-web/scripts/transform-pt.mjs'
s=open(p).read()
# paragraph
s=s.replace("      const t = htmlToText(inner);\n      if (t) blocks.push(block('normal', t));",
            "      const t = htmlToText(inner);\n      if (t) blocks.push(block('normal', inner));")
# heading
s=s.replace("      const t = htmlToText(inner);\n      if (t) blocks.push(block('h' + lvl, t));",
            "      const t = htmlToText(inner);\n      if (t) blocks.push(block('h' + lvl, inner));")
# list
old_list="""    } else if (name === 'list') {
      const items = inner.split(/<!--\\s+\\/wp:list-item\\s*-->/).map(htmlToText).filter(Boolean);
      const style = /<ol/i.test(inner) ? 'number' : 'bullet';
      items.forEach((t) => blocks.push({ _type: 'block', _key: k(), style, listItem: style, markDefs: [], children: parseInline(t) }));
    }"""
new_list="""    } else if (name === 'list') {
      const liMatches = [...inner.matchAll(/<li[^>]*>([\\s\\S]*?)<\\/li>/gi)];
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
    }"""
assert old_list in s, 'list block not found'
s=s.replace(old_list,new_list)
# list-item
s=s.replace("""      const t = htmlToText(inner);
      if (t) blocks.push({ _type: 'block', _key: k(), style: 'bullet', listItem: 'bullet', markDefs: [], children: parseInline(t) });""",
            """      const t = htmlToText(inner);
      if (t) {
        const children = parseInline(inner);
        const md = parseInline._lastMarkDefs || []; parseInline._lastMarkDefs = [];
        blocks.push({ _type: 'block', _key: k(), style: 'normal', listItem: 'bullet', level: 1, markDefs: md, children });
      }""")
# unknown block rawBlock -> rawHtml
s=s.replace("""      const t = htmlToText(inner);
      blocks.push({ _type: 'rawBlock', _key: k(), blockName: 'wp:' + name, html: inner.trim(), text: t });
      unmapped.push({ block: 'wp:' + name, note: 'preserved as rawBlock', sample: t.slice(0, 80) });""",
            """      const t = htmlToText(inner);
      blocks.push({ _type: 'rawHtml', _key: k(), blockName: 'wp:' + name, html: inner.trim(), text: t });
      unmapped.push({ block: 'wp:' + name, note: 'preserved as rawHtml', sample: t.slice(0, 80) });""")
# top-level legacy paragraphs
s=s.replace("    content.split(/\\n{2,}|<br\\s*\\/?>/i).forEach((chunk) => { const t = htmlToText(chunk); if (t) blocks.push(block('normal', t)); });",
            "    content.split(/\\n{2,}|<br\\s*\\/?>/i).forEach((chunk) => { const t = htmlToText(chunk); if (t) blocks.push(block('normal', chunk)); });")
open(p,'w').write(s)
print('done')
