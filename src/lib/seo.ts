import type { Metadata } from 'next';
import { SITE_NAME, absoluteUrl } from './site';
import { parseImageRef } from '@/sanity/lib/image';
import { sanityLoader } from '@/sanity/lib/image';

/** Default share image (site logo on a 1200x630 card). A static file: a file-based opengraph-image would be dropped by any page that sets its own openGraph. */
export const DEFAULT_OG_IMAGE = { url: absoluteUrl('/og-default.png'), width: 1200, height: 630 };

export function ogImageUrl(ref?: string | null): string | undefined {
  const parsed = ref ? parseImageRef(ref) : null;
  if (!parsed) return undefined;
  const u = new URL(sanityLoader({ src: parsed.url, width: 1200, quality: 80 }));
  return u.toString();
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
  image?: string;
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
      images: [o.image ? { url: o.image, width: 1200 } : DEFAULT_OG_IMAGE],
      ...(o.type === 'article' ? { publishedTime: o.publishedTime, modifiedTime: o.modifiedTime } : {}),
    },
    twitter: { card: 'summary_large_image', title: o.title, description, images: [o.image ?? DEFAULT_OG_IMAGE.url] },
  };
}
