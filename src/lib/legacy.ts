// Pure routing logic for legacy WordPress URLs (no framework imports, so it is unit-testable in Node).
export type LegacyAction =
  | { type: 'rewrite'; kind: 'post' | 'category' | 'tag' | 'search' | 'author' | 'media'; value: string }
  | { type: 'redirect'; to: string }
  | null;

export function resolveLegacy(pathname: string, search: URLSearchParams): LegacyAction {
  if (pathname === '/') {
    const p = search.get('p') ?? search.get('page_id');
    if (p) return { type: 'rewrite', kind: 'post', value: p };
    const cat = search.get('cat');
    if (cat) return { type: 'rewrite', kind: 'category', value: cat };
    const tag = search.get('tag');
    if (tag) return { type: 'rewrite', kind: 'tag', value: tag };
    if (search.has('s')) return { type: 'rewrite', kind: 'search', value: search.get('s') ?? '' };
    if (search.has('author')) return { type: 'rewrite', kind: 'author', value: search.get('author') ?? '' };
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
    return { type: 'rewrite', kind: 'media', value: path };
  }
  return null;
}
