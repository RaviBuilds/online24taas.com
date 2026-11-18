import type { Metadata } from 'next';
import { SITE_NAME, absoluteUrl } from './site';
import { parseImageRef } from '@/sanity/lib/image';

/** Default share image (site logo on a 1200x630 card). A static file: a file-based opengraph-image would be dropped by any page that sets its own openGraph. */
export const DEFAULT_OG_IMAGE = { url: absoluteUrl('/og-default.png'), width: 1200, height: 630 };

export interface OgImage {
  url: string;
  width: number;
  height: number;
  type: string;
}

/**
 * Social share image for a Sanity image ref: a 1200x630 JPEG on Sanity's public CDN (absolute https, no auth,
 * no signed URL). JPEG is forced (no auto=format) because crawlers do not all accept WebP/AVIF. Sources narrower
 * than 1200px are not upscaled: they keep their own size so the declared dimensions stay truthful.
 * The image shown on the article page itself is untouched.
 */
export function ogImage(ref?: string | null): OgImage | undefined {
  const parsed = ref ? parseImageRef(ref) : null;
  if (!parsed) return undefined;
  const u = new URL(parsed.url);
  u.searchParams.set('fm', 'jpg');
  u.searchParams.set('q', '80');
  if (parsed.width >= 1200 && parsed.height >= 630) {
    u.searchParams.set('w', '1200');
    u.searchParams.set('h', '630');
    u.searchParams.set('fit', 'crop');
    return { url: u.toString(), width: 1200, height: 630, type: 'image/jpeg' };
  }
  return { url: u.toString(), width: parsed.width, height: parsed.height, type: 'image/jpeg' };
}

/** URL-only variant (structured data). */
export function ogImageUrl(ref?: string | null): string | undefined {
  return ogImage(ref)?.url;
}

export function plainDescription(text?: string | null, max = 160): string | undefined {
  const t = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return undefined;
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

interface Opts {
  title: string;
  description?: string;
  path: string; // canonical path (already encoded)
  image?: OgImage;
  imageAlt?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
  canonicalOverride?: string;
}

export function buildMetadata(o: Opts): Metadata {
  const canonical = o.canonicalOverride || absoluteUrl(o.path);
  // Every indexable page gets a description; archives and pages without editor-written text fall back to the title.
  const description = o.description || `${o.title} - ${SITE_NAME}`;
  return {
    title: o.title,
    description,
    alternates: { canonical },
    // Only set when needed: an explicit `robots: undefined` here would also wipe the layout-level noindex of previews.
    ...(o.noIndex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: o.title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      locale: 'mr_IN',
      type: o.type ?? 'website',
      images: [
        o.image
          ? { url: o.image.url, secureUrl: o.image.url, width: o.image.width, height: o.image.height, type: o.image.type, alt: o.imageAlt || o.title }
          : { ...DEFAULT_OG_IMAGE, secureUrl: DEFAULT_OG_IMAGE.url, type: 'image/png', alt: SITE_NAME },
      ],
      ...(o.type === 'article' ? { publishedTime: o.publishedTime, modifiedTime: o.modifiedTime } : {}),
    },
    twitter: { card: 'summary_large_image', title: o.title, description, images: [{ url: o.image?.url ?? DEFAULT_OG_IMAGE.url, alt: o.image ? o.imageAlt || o.title : SITE_NAME }] },
  };
}
