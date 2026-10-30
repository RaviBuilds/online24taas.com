// Single source of truth for public routes. Slugs contain Marathi characters, so every segment is
// percent-encoded for hrefs; Next decodes them again on the way in (see decodeParam).
const seg = (s: string) => encodeURIComponent(s);
export const postPath = (slug: string) => `/blog/${seg(slug)}`;
export const pagePath = (slug: string) => `/${seg(slug)}`;
export const categoryPath = (slug: string, page = 1) => `/category/${seg(slug)}${page > 1 ? `/page/${page}` : ''}`;
export const tagPath = (slug: string, page = 1) => `/tag/${seg(slug)}${page > 1 ? `/page/${page}` : ''}`;
export const blogPath = (page = 1) => (page > 1 ? `/blog/page/${page}` : '/blog');
export const authorPath = (slug: string) => `/author/${seg(slug)}`;
export const searchPath = (q: string, page = 1) => `/search?q=${encodeURIComponent(q)}${page > 1 ? `&page=${page}` : ''}`;

export function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
