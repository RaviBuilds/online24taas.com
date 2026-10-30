import sanitize from 'sanitize-html';

// Allow-list sanitiser for the `rawHtml` fallback blocks. Scripts, forms, event handlers and unsafe URL
// schemes are removed; iframes are only kept for explicitly allow-listed hosts (Amazon ad widgets that
// existed in one migrated post).
export const IFRAME_HOSTS = ['ws-in.amazon-adsystem.com', 'ws-na.amazon-adsystem.com', 'rcm-na.amazon-adsystem.com'];

export function sanitizeHtml(html: string): string {
  return sanitize(html, {
    allowedTags: ['p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 'mark', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'figure', 'figcaption', 'blockquote', 'span', 'div', 'iframe', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      iframe: ['src', 'width', 'height', 'frameborder', 'scrolling', 'marginwidth', 'marginheight', 'sandbox', 'style', 'title'],
      '*': ['id'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https'], iframe: ['https'] },
    allowProtocolRelative: true,
    allowedIframeHostnames: IFRAME_HOSTS,
    allowedStyles: { iframe: { width: [/^\d+(px|%)$/], height: [/^\d+(px|%)$/] } },
    transformTags: {
      a: (tag, attribs) => ({
        tagName: 'a',
        attribs: { ...attribs, ...(attribs.target === '_blank' ? { rel: 'noopener noreferrer' } : {}) },
      }),
    },
    // an <iframe> whose src was rejected (unknown host / bad scheme) is dropped entirely
    exclusiveFilter: (frame) => frame.tag === 'iframe' && !frame.attribs.src,
    disallowedTagsMode: 'discard',
  });
}
