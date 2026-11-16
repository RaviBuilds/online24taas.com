// Presentation helpers only: nothing here touches URLs, metadata or queries.
import type { PostCardData } from './data';
import { parseImageRef } from '@/sanity/lib/image';

export const PUBLICATION_BYLINE = 'ऑनलाईन२४तास';

type Cat = { title: string; slug: string };

/** WordPress left a default "All" category on many posts. It is never shown to readers. */
export const isPlaceholderCategory = (c?: { title?: string | null; slug?: string | null } | null) =>
  !!c && (c.slug?.toLowerCase() === 'all' || c.title?.trim().toLowerCase() === 'all');

export function realCategories<T extends Cat>(cats?: T[] | null): T[] {
  return (cats ?? []).filter((c) => !isPlaceholderCategory(c));
}
export const primaryCategory = <T extends Cat>(cats?: T[] | null): T | undefined => realCategories(cats)[0];

/** Every migrated post is authored by the generic WordPress "admin" user. Show the publication instead. */
export function bylineName(name?: string | null): string {
  const n = name?.trim();
  if (!n || n.toLowerCase() === 'admin') return PUBLICATION_BYLINE;
  return n;
}
export const hasRealAuthor = (name?: string | null) => !!name?.trim() && name.trim().toLowerCase() !== 'admin';

export type Tone = 'saffron' | 'green' | 'rose' | 'indigo' | 'blue' | 'red';
const TONES: Record<string, Tone> = {
  'अध्यात्मिक': 'saffron',
  'आरोग्य': 'green',
  'लव्ह-स्टोरीज': 'rose',
  'राशिभविष्य': 'indigo',
  'स्पोर्ट्स': 'blue',
};
export const toneFor = (slug?: string | null): Tone => (slug && TONES[slug.normalize('NFC')]) || 'red';

const num = new Intl.NumberFormat('mr-IN');
export const formatNumber = (n: number) => num.format(n);

/** Intrinsic ratio from the Sanity asset id (`image-<hash>-<w>x<h>-<ext>`): no extra query needed. */
export function imageRatio(ref?: string | null): number | null {
  const p = ref ? parseImageRef(ref) : null;
  return p ? p.width / p.height : null;
}

/** Posts that can lead a block: they need an image of a sensible size. */
export const hasUsableImage = (p: PostCardData) => {
  const parsed = p.image?.ref ? parseImageRef(p.image.ref) : null;
  return !!parsed && parsed.width >= 600 && parsed.height >= 300;
};

/** Pulls posts out of `pool` that are not in `used`, marking them used. */
export function take(pool: PostCardData[], used: Set<string>, n: number, where: (p: PostCardData) => boolean = () => true): PostCardData[] {
  const out: PostCardData[] = [];
  for (const p of pool) {
    if (out.length >= n) break;
    if (used.has(p._id) || !where(p)) continue;
    out.push(p);
    used.add(p._id);
  }
  return out;
}
