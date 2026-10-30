// Local document validation. Sanity's Content Lake does NOT run Studio validation rules on API writes,
// so everything that matters is enforced here before any remote write.
const STYLES = new Set(['normal', 'center', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote']);
const DECORATORS = new Set(['strong', 'em', 'underline', 'strike-through', 'highlight', 'code', 'sup', 'sub']);
const MARKDEF_TYPES = new Set(['link', 'textColor']);
const ID_PATTERNS = {
  author: /^author-\d+$/,
  category: /^category-\d+$/,
  tag: /^tag-\d+$/,
  mediaAsset: /^mediaAsset-\d+$/,
  post: /^(drafts\.)?post-\d+$/,
  page: /^(drafts\.)?page-\d+$/,
  menu: /^menu-\d+$/,
  siteSettings: /^siteSettings$/,
  redirect: /^redirect-[\w-]+$/,
};
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const MOJIBAKE = /à¤|à¥|Ã.|\uFFFD/;
const PCT = /%[0-9a-fA-F]{2}/;

export function validateDocuments(docs, { knownRefTargets = new Set(), requireAssets = true } = {}) {
  const errors = [];
  const err = (doc, msg) => errors.push(`${doc?._id ?? '?'}: ${msg}`);
  const ids = new Set();
  for (const d of docs) {
    if (ids.has(d._id)) err(d, 'duplicate _id in bundle');
    ids.add(d._id);
  }
  const slugsByType = new Map();
  const wpIds = new Map();

  for (const d of docs) {
    if (!d._id || !d._type) { err(d, 'missing _id/_type'); continue; }
    const pat = ID_PATTERNS[d._type];
    if (!pat) err(d, `unknown _type ${d._type}`);
    else if (!pat.test(d._id)) err(d, `_id does not match deterministic pattern for ${d._type}`);

    const checkText = (label, s) => {
      if (typeof s !== 'string') return;
      if (MOJIBAKE.test(s)) err(d, `${label} contains mojibake / replacement characters`);
    };
    const walkStrings = (v, p) => {
      if (typeof v === 'string') checkText(p, v);
      else if (Array.isArray(v)) v.forEach((x, i) => walkStrings(x, `${p}[${i}]`));
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (k !== '_ref') walkStrings(x, `${p}.${k}`);
    };
    walkStrings(d, '$');

    if (['post', 'page'].includes(d._type)) {
      const isDraft = d._id.startsWith('drafts.');
      if (!isDraft && !d.title) err(d, 'published document needs a title');
      if (!d.slug?.current) err(d, 'missing slug.current');
      else {
        if (PCT.test(d.slug.current)) err(d, `slug is still percent-encoded: ${d.slug.current}`);
        if (d.slug.current !== d.slug.current.normalize('NFC')) err(d, 'slug not NFC');
        if (/\s|\//.test(d.slug.current)) err(d, 'slug contains whitespace or slash');
        const k = d._type;
        if (!slugsByType.has(k)) slugsByType.set(k, new Map());
        const seen = slugsByType.get(k);
        const base = d._id.replace(/^drafts\./, '');
        if (seen.has(d.slug.current) && seen.get(d.slug.current) !== base) err(d, `slug collides with ${seen.get(d.slug.current)}: ${d.slug.current}`);
        seen.set(d.slug.current, base);
      }
      for (const f of ['publishedAt', 'modifiedAt']) if (d[f] && !ISO.test(d[f])) err(d, `${f} not ISO-8601 UTC: ${d[f]}`);
      if (!Number.isInteger(d.wpPostId)) err(d, 'missing wpPostId');
      else {
        const key = `${d._type}:${d.wpPostId}`;
        if (wpIds.has(key)) err(d, `wpPostId ${d.wpPostId} appears twice (${wpIds.get(key)})`);
        wpIds.set(key, d._id);
        if (d._id.replace('drafts.', '') !== `${d._type}-${d.wpPostId}`) err(d, '_id does not embed wpPostId');
      }
      if (d.title && /<[a-z/][^>]*>|&nbsp;|&amp;/i.test(d.title)) err(d, 'title contains HTML');
      if (d.body) validatePortableText(d, d.body, err, requireAssets);
    }
    if (['category', 'tag'].includes(d._type)) {
      if (!d.title || !d.slug?.current) err(d, 'taxonomy needs title + slug');
      else if (PCT.test(d.slug.current)) err(d, 'taxonomy slug percent-encoded');
    }
    if (d._type === 'mediaAsset' && requireAssets && !d.image?.asset && !d.file?.asset) err(d, 'mediaAsset has no uploaded asset');
    if (d.featuredImage) {
      if (requireAssets && !d.featuredImage.asset?._ref) err(d, 'featuredImage without asset');
    }
    if (JSON.stringify(d).length > 900_000) err(d, 'document close to the 4MB/1MB practical limit');
  }

  // reference integrity within bundle (+ known remote targets, e.g. assets)
  for (const d of docs) {
    const walk = (v, p) => {
      if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`));
      else if (v && typeof v === 'object') {
        if (v._type === 'reference' || (typeof v._ref === 'string' && Object.keys(v).includes('_ref'))) {
          const target = v._ref;
          const ok = ids.has(target) || knownRefTargets.has(target) || (target.startsWith('image-') || target.startsWith('file-')) && knownRefTargets.has(target);
          const hasDraftOfTarget = ids.has('drafts.' + target);
          if (!ok && !hasDraftOfTarget && !v._weak) err(d, `strong reference to missing document ${target} at ${p}`);
        } else for (const [k, x] of Object.entries(v)) walk(x, `${p}.${k}`);
      }
    };
    walk(d, '$');
  }
  return errors;
}

function validatePortableText(doc, body, err, requireAssets) {
  const keys = new Set();
  const checkKey = (k, where) => {
    if (!k) err(doc, `${where}: missing _key`);
    else if (keys.has(k)) err(doc, `${where}: duplicate _key ${k}`);
    keys.add(k);
  };
  body.forEach((b, i) => {
    const where = `body[${i}]`;
    checkKey(b._key, where);
    if (b._type === 'block') {
      if (!STYLES.has(b.style)) err(doc, `${where}: unknown style ${b.style}`);
      if (!Array.isArray(b.children) || !b.children.length) err(doc, `${where}: block has no children`);
      const defs = new Map((b.markDefs || []).map((m) => [m._key, m]));
      for (const m of b.markDefs || []) {
        if (!MARKDEF_TYPES.has(m._type)) err(doc, `${where}: unknown markDef type ${m._type}`);
        checkKey(m._key, `${where}.markDefs`);
        if (m._type === 'link' && !m.href) err(doc, `${where}: link without href`);
        if (m._type === 'link' && /^\s*javascript:/i.test(m.href || '')) err(doc, `${where}: javascript: link`);
      }
      let hasText = false;
      for (const c of b.children || []) {
        checkKey(c._key, `${where}.children`);
        if (c._type !== 'span') err(doc, `${where}: non-span child`);
        if (typeof c.text !== 'string') err(doc, `${where}: span without text`);
        if (c.text && c.text.trim()) hasText = true;
        for (const m of c.marks || []) if (!DECORATORS.has(m) && !defs.has(m)) err(doc, `${where}: mark ${m} not a decorator or markDef`);
        if (/\*\*|(^|\s)_[^\s_]+_(\s|$)/.test(c.text || '') && false) err(doc, `${where}: markdown-ish leakage`);
      }
      if (!hasText) err(doc, `${where}: block with only empty text`);
      if (b.listItem && !['bullet', 'number'].includes(b.listItem)) err(doc, `${where}: bad listItem`);
      if (b.listItem && !(b.level >= 1)) err(doc, `${where}: listItem without level`);
    } else if (b._type === 'image') {
      if (requireAssets && !b.asset?._ref) err(doc, `${where}: image without asset`);
      if (!b.asset && !b.sourceUrl) err(doc, `${where}: image with neither asset nor sourceUrl`);
      if (b._needsAsset) err(doc, `${where}: leftover _needsAsset flag`);
    } else if (b._type === 'rawHtml') {
      if (!b.html) err(doc, `${where}: empty rawHtml`);
    } else err(doc, `${where}: unknown block type ${b._type}`);
  });
}
