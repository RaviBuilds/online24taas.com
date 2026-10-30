import type { MetadataRoute } from 'next';
import { sanityFetch } from '@/sanity/lib/client';
import { SITEMAP_QUERY } from '@/sanity/lib/queries';
import { absoluteUrl } from '@/lib/site';
import { categoryPath, pagePath, postPath, tagPath } from '@/lib/urls';

export const revalidate = 3600;

interface Row { slug: string; updated?: string }

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const d = await sanityFetch<{ posts: Row[]; pages: Row[]; categories: Row[]; tags: Row[] }>(SITEMAP_QUERY, {}, ['posts', 'pages', 'taxonomy']);
  const entry = (path: string, updated?: string, priority = 0.6): MetadataRoute.Sitemap[number] => ({ url: absoluteUrl(path), ...(updated ? { lastModified: updated } : {}), priority });
  return [
    entry('/', undefined, 1),
    entry('/blog', undefined, 0.8),
    ...d.categories.map((c) => entry(categoryPath(c.slug), undefined, 0.7)),
    ...d.tags.map((t) => entry(tagPath(t.slug), undefined, 0.4)),
    ...d.pages.map((p) => entry(pagePath(p.slug), p.updated, 0.5)),
    ...d.posts.map((p) => entry(postPath(p.slug), p.updated, 0.7)),
  ];
}
