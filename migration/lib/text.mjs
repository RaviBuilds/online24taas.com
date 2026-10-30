import { decodeHTML } from 'entities';

/** Plain-text title from a WordPress post_title (which may contain <br>, <strong>, &nbsp;). */
export function cleanTitle(raw) {
  return decodeHTML(String(raw ?? '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ''))
    .replace(/[\u00a0\s]+/g, ' ')
    .trim()
    .normalize('NFC');
}
