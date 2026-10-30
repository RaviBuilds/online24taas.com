import { NextResponse, type NextRequest } from 'next/server';
import { resolveLegacy } from './lib/legacy';

// next.config redirects cannot express "query param p -> lookup by id", so legacy requests are
// rewritten to /api/legacy, which resolves the id against Sanity and answers with a 301.
// See lib/legacy.ts for the URL table.
export function middleware(req: NextRequest) {
  const action = resolveLegacy(req.nextUrl.pathname, req.nextUrl.searchParams);
  if (!action) return NextResponse.next();
  if (action.type === 'redirect') return NextResponse.redirect(new URL(action.to, req.url), 301);
  const url = req.nextUrl.clone();
  url.pathname = '/api/legacy';
  url.search = '';
  Object.entries(action.params).forEach(([k, v]) => url.searchParams.set(k, v));
  return NextResponse.rewrite(url);
}

export const config = { matcher: ['/', '/feed', '/feed/', '/rss', '/rss/', '/wp-content/uploads/:path*'] };
