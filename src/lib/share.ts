// Share-link helpers. The canonical article URL is percent-encoded (see postPath in urls.ts) and is shared
// exactly as is: the same string is used for canonical, og:url, the sitemap, the copied link and chat messages.
// Pure ASCII keeps the link intact and clickable in every chat app, and gives crawlers (WhatsApp, Facebook,
// Telegram, X) the identical URL they find in og:url, so the rich preview is built from the article's own tags.
// The visible Marathi title is only ever placed in text parameters, each encoded exactly once.

/** Message body for chat apps: title, blank line, canonical URL. */
export function shareMessage(title: string, url: string): string {
  return `${title.trim()}\n\n${url}`;
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
