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
  // Parameters travel in the rewritten PATH (a rewritten route handler can still see the original
  // query string, which made query-based hand-off unreliable).
  const value = (action.value || '-').split('/').map(encodeURIComponent).join('/');
  url.pathname = `/api/legacy/${action.kind}/${value}`;
  url.search = '';
  return NextResponse.rewrite(url);
}

export const config = { matcher: ['/', '/feed', '/feed/', '/rss', '/rss/', '/wp-content/uploads/:path*'] };
