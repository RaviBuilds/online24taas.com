import { NextResponse, type NextRequest } from 'next/server';
import { sanityFetch } from '@/sanity/lib/client';
import { LEGACY_CATEGORY_QUERY, LEGACY_MEDIA_QUERY, LEGACY_POST_QUERY, LEGACY_TAG_QUERY } from '@/sanity/lib/queries';
import { categoryPath, decodeParam, pagePath, postPath, searchPath, tagPath } from '@/lib/urls';

// Target of the middleware rewrite for legacy WordPress URLs: /api/legacy/<kind>/<value...>.
// Answers with a permanent redirect to the current route, or 404 when the legacy id no longer maps to
// published content. Destinations are fresh routes without legacy parameters, so loops are impossible.
export const dynamic = 'force-dynamic';

const permanent = (req: NextRequest, to: string) => NextResponse.redirect(new URL(to, req.url), 301);
const int = (v: string) => (/^\d{1,9}$/.test(v) ? Number(v) : null);
const notFound = () => new NextResponse('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex' } });

export async function GET(req: NextRequest, { params }: { params: Promise<{ kind: string; rest: string[] }> }) {
  const { kind, rest } = await params;
  const parts = rest.map(decodeParam);
  const value = parts.join('/');

  if (kind === 'post') {
    const id = int(value);
    const doc = id ? await sanityFetch<{ _type: string; slug: string } | null>(LEGACY_POST_QUERY, { id }, ['posts', 'pages']) : null;
    if (doc?.slug) return permanent(req, doc._type === 'page' ? pagePath(doc.slug) : postPath(doc.slug));
  } else if (kind === 'category') {
    const id = int(value);
    const doc = id ? await sanityFetch<{ slug: string } | null>(LEGACY_CATEGORY_QUERY, { id }, ['taxonomy']) : null;
    if (doc?.slug) return permanent(req, categoryPath(doc.slug));
  } else if (kind === 'tag') {
    const doc = await sanityFetch<{ slug: string } | null>(LEGACY_TAG_QUERY, { slug: value.slice(0, 200) }, ['taxonomy']);
    if (doc?.slug) return permanent(req, tagPath(doc.slug));
  } else if (kind === 'search') {
    const q = (value === '-' ? '' : value).slice(0, 100);
    return permanent(req, q ? searchPath(q) : '/');
  } else if (kind === 'author') {
    return permanent(req, '/blog');
  } else if (kind === 'media') {
    // 2024/10/name-300x200.jpg -> exact file, then the original without the size suffix, then -scaled
    const path = value.slice(0, 300);
    const candidates = [path, path.replace(/-\d+x\d+(\.[a-z0-9]+)$/i, '$1'), path.replace(/-\d+x\d+(\.[a-z0-9]+)$/i, '-scaled$1')];
    for (const c of candidates) {
      const doc = await sanityFetch<{ url?: string } | null>(LEGACY_MEDIA_QUERY, { path: c }, ['media']);
      if (doc?.url) return NextResponse.redirect(doc.url, 301);
    }
  }
  return notFound();
}
