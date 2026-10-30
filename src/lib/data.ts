import 'server-only';
import { cache } from 'react';
import { sanityFetch } from '@/sanity/lib/client';
import { SITE_QUERY } from '@/sanity/lib/queries';
import { POSTS_PER_PAGE } from './site';

export interface PostCardData {
  _id: string;
  title: string;
  slug: string;
  publishedAt: string;
  excerpt?: string | null;
  image?: { ref?: string | null; alt?: string | null; caption?: string | null } | null;
  categories?: { title: string; slug: string }[] | null;
  authorName?: string | null;
}
export interface SiteData {
  settings: { title?: string; tagline?: string; adsensePublisherId?: string; footerText?: string; socialLinks?: { label: string; url: string }[]; logoRef?: string; faviconRef?: string } | null;
  menu: { items?: { label?: string; url?: string; target?: { _type: string; title?: string; slug?: string } | null }[] } | null;
  pages: { title: string; slug: string }[];
  categories: { title: string; slug: string; count: number }[];
}

// De-duplicated per request; revalidated every 5 minutes (and on webhook) via sanityFetch tags.
export const getSite = cache(async (): Promise<SiteData> => sanityFetch<SiteData>(SITE_QUERY, {}, ['site']));

export function pageRange(page: number) {
  const from = (page - 1) * POSTS_PER_PAGE;
  return { from, to: from + POSTS_PER_PAGE };
}
export const totalPages = (total: number) => Math.max(1, Math.ceil(total / POSTS_PER_PAGE));
export function parsePage(value: unknown): number {
  const n = Number.parseInt(String(value ?? '1'), 10);
  return Number.isFinite(n) && n >= 1 && n < 10000 ? n : 1;
}

/** Strict variant for /page/[n] routes: anything that is not a sane positive integer is a 404, never "page 1". */
export function parsePageStrict(value: string): number | null {
  if (!/^\d{1,4}$/.test(value)) return null;
  const n = Number(value);
  return n >= 1 ? n : null;
}
