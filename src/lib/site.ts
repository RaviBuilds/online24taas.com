export const SITE_NAME = 'Online24Taas';
export const SITE_TAGLINE = 'All Interesting Facts';
export const POSTS_PER_PAGE = 10;
// Canonical origin. Set NEXT_PUBLIC_SITE_URL per environment; production is the original WordPress domain.
// Preview deployments without an explicit value use their own URL, so canonical/OG/sitemap links stay on the preview.
const previewUrl = process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? previewUrl ?? 'https://www.online24taas.com').replace(/\/$/, '');
export const absoluteUrl = (path = '/') => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
