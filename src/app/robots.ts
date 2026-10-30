import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  // Non-production deployments must never be indexed.
  const isProd = process.env.VERCEL_ENV ? process.env.VERCEL_ENV === 'production' : process.env.NODE_ENV === 'production';
  if (!isProd) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/studio', '/api/', '/search'] }],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
