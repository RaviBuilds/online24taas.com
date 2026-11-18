// Share-link helpers. The canonical article URL is percent-encoded (see postPath in urls.ts) and must stay
// that way for canonical/OG/sitemap. For text that people read (WhatsApp message, copied link) we show a
// readable Unicode form instead (the Marathi slug). Link previews are built by the crawler from the page's
// og: tags, so they do not depend on how the URL looks in the message. Each platform's link is built from
// exactly one encoding pass.

/**
 * Readable form of a URL for display. Uses decodeURI (not decodeURIComponent), so reserved characters
 * (%2F, %3F, %23, %26 ...) stay encoded and the URL keeps its meaning. Whitespace and quote-like characters
 * are re-encoded so chat apps do not cut the link. Falls back to the input on malformed encoding.
 */
export function readableUrl(url: string): string {
  try {
    return decodeURI(url).replace(/[\s"<>\\^`{|}]/g, (c) => encodeURIComponent(c));
  } catch {
    return url;
  }
}

/** Message body for chat apps: title, blank line, readable URL. */
export function shareMessage(title: string, url: string): string {
  return `${title.trim()}\n\n${readableUrl(url)}`;
}

/** WhatsApp link (wa.me works on mobile and WhatsApp Web). The whole message is encoded exactly once. */
export function whatsappHref(title: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(shareMessage(title, url))}`;
}

export function facebookHref(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function xHref(title: string, url: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(title.trim())}&url=${encodeURIComponent(url)}`;
}

export function telegramHref(title: string, url: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title.trim())}`;
}
