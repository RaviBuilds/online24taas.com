// Pure routing logic for legacy WordPress URLs (no framework imports, so it is unit-testable in Node).
export type LegacyAction =
  | { type: 'rewrite'; params: Record<string, string> }
  | { type: 'redirect'; to: string }
  | null;

export function resolveLegacy(pathname: string, search: URLSearchParams): LegacyAction {
  if (pathname === '/') {
    const p = search.get('p') ?? search.get('page_id');
    if (p) return { type: 'rewrite', params: { kind: 'post', id: p } };
    const cat = search.get('cat');
    if (cat) return { type: 'rewrite', params: { kind: 'category', id: cat } };
    const tag = search.get('tag');
    if (tag) return { type: 'rewrite', params: { kind: 'tag', slug: tag } };
    if (search.has('s')) return { type: 'rewrite', params: { kind: 'search', q: search.get('s') ?? '' } };
    if (search.has('author')) return { type: 'rewrite', params: { kind: 'author' } };
    if (search.has('feed')) return { type: 'redirect', to: '/feed.xml' };
    return null;
  }
  if (['/feed', '/feed/', '/rss', '/rss/'].includes(pathname)) return { type: 'redirect', to: '/feed.xml' };
  if (pathname.startsWith('/wp-content/uploads/')) {
    let path = pathname.slice('/wp-content/uploads/'.length);
    try {
      path = decodeURIComponent(path);
    } catch {
      /* keep raw */
    }
    return { type: 'rewrite', params: { kind: 'media', path } };
  }
  return null;
}
