export const SITE_NAME = 'Online24Taas';
export const SITE_TAGLINE = 'All Interesting Facts';
export const POSTS_PER_PAGE = 10;
// Canonical origin. Set NEXT_PUBLIC_SITE_URL per environment; production is the original WordPress domain.
// Preview deployments without an explicit value use their own URL, so canonical/OG/sitemap links stay on the preview.
const previewUrl = process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
const PRODUCTION_URL = 'https://www.online24taas.com';

/**
 * Accepts an origin only if it is a usable public one: http(s), a host with a real domain and TLD ("www.online24taas"
 * cannot resolve) and not localhost. A misconfigured env var otherwise ends up in canonical, og:url and the
 * sitemap, and link-preview crawlers then drop the preview. Returns the origin without path or trailing slash.
 */
export function normalizeOrigin(value: string | undefined | null): string | undefined {
  const raw = (value ?? '').trim();
  if (!raw) return undefined;
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = u.hostname;
    const labels = host.split('.');
    // "www.online24taas" has two labels but is www plus a TLD-less name; no such host exists.
    if (labels.length < 2 || (labels[0] === 'www' && labels.length < 3) || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return undefined;
    return u.origin;
  } catch {
    return undefined;
  }
}

const isProductionBuild = process.env.VERCEL_ENV === 'production' || (!process.env.VERCEL_ENV && process.env.NODE_ENV === 'production');
// Local development may use localhost; every real deployment must not.
const configured = process.env.NEXT_PUBLIC_SITE_URL;
const localOk = !isProductionBuild && /^https?:\/\/localhost(:\d+)?\/?$/i.test((configured ?? '').trim()) ? configured!.trim().replace(/\/$/, '') : undefined;
export const SITE_URL = localOk ?? normalizeOrigin(configured) ?? previewUrl ?? PRODUCTION_URL;
export const absoluteUrl = (path = '/') => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;