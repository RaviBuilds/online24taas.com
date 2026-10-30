import { NextResponse, type NextRequest } from 'next/server';
import { sanityFetch } from '@/sanity/lib/client';
import { LEGACY_CATEGORY_QUERY, LEGACY_MEDIA_QUERY, LEGACY_POST_QUERY, LEGACY_TAG_QUERY, REDIRECT_QUERY } from '@/sanity/lib/queries';
import { categoryPath, pagePath, postPath, searchPath, tagPath } from '@/lib/urls';

// Target of the middleware rewrite for legacy WordPress URLs. Always answers with a permanent redirect
// to the current route, or 404 when the legacy id no longer maps to published content (never a loop:
// destinations are fresh routes that carry none of the legacy query parameters).
export const dynamic = 'force-dynamic';

const permanent = (req: NextRequest, to: string) => NextResponse.redirect(new URL(to, req.url), 301);
const int = (v: string | null) => (v && /^\d{1,9}$/.test(v) ? Number(v) : null);

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const kind = sp.get('kind');

  if (kind === 'post') {
    const id = int(sp.get('id'));
    const doc = id ? await sanityFetch<{ _type: string; slug: string } | null>(LEGACY_POST_QUERY, { id }, ['posts', 'pages']) : null;
    if (doc?.slug) return permanent(req, doc._type === 'page' ? pagePath(doc.slug) : postPath(doc.slug));
  } else if (kind === 'category') {
    const id = int(sp.get('id'));
    const doc = id ? await sanityFetch<{ slug: string } | null>(LEGACY_CATEGORY_QUERY, { id }, ['taxonomy']) : null;
    if (doc?.slug) return permanent(req, categoryPath(doc.slug));
  } else if (kind === 'tag') {
    const slug = (sp.get('slug') ?? '').slice(0, 200);
    const doc = slug ? await sanityFetch<{ slug: string } | null>(LEGACY_TAG_QUERY, { slug }, ['taxonomy']) : null;
    if (doc?.slug) return permanent(req, tagPath(doc.slug));
  } else if (kind === 'search') {
    const q = (sp.get('q') ?? '').slice(0, 100);
    return permanent(req, q ? searchPath(q) : '/');
  } else if (kind === 'author') {
    return permanent(req, '/blog');
  } else if (kind === 'media') {
    const path = (sp.get('path') ?? '').slice(0, 300);
    // /wp-content/uploads/2024/10/name-300x200.jpg -> try exact file, then the original without the size suffix
    const candidates = [path, path.replace(/-\d+x\d+(\.[a-z0-9]+)$/i, '$1'), path.replace(/-\d+x\d+(\.[a-z0-9]+)$/i, '-scaled$1')];
    for (const c of candidates) {
      const doc = await sanityFetch<{ url?: string } | null>(LEGACY_MEDIA_QUERY, { path: c }, ['media']);
      if (doc?.url) return NextResponse.redirect(doc.url, 301);
    }
  } else if (kind === 'redirect') {
    const path = sp.get('path') ?? '';
    const doc = await sanityFetch<{ destination: string; permanent?: boolean } | null>(REDIRECT_QUERY, { path }, ['redirects']);
    if (doc?.destination && doc.destination !== path) return NextResponse.redirect(new URL(doc.destination, req.url), doc.permanent === false ? 302 : 301);
  }
  return new NextResponse('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex' } });
}
