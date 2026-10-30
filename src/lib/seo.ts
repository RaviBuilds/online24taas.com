import type { Metadata } from 'next';
import { SITE_NAME, absoluteUrl } from './site';
import { parseImageRef } from '@/sanity/lib/image';
import { sanityLoader } from '@/sanity/lib/image';

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
  return {
    title: o.title,
    description: o.description,
    alternates: { canonical },
    robots: o.noIndex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: o.title,
      description: o.description,
      url: canonical,
      siteName: SITE_NAME,
      locale: 'mr_IN',
      type: o.type ?? 'website',
      ...(o.image ? { images: [{ url: o.image, width: 1200 }] } : {}),
      ...(o.type === 'article' ? { publishedTime: o.publishedTime, modifiedTime: o.modifiedTime } : {}),
    },
    twitter: { card: 'summary_large_image', title: o.title, description: o.description, ...(o.image ? { images: [o.image] } : {}) },
  };
}
