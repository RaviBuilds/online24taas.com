import { sanityFetch } from '@/sanity/lib/client';
import { FEED_QUERY } from '@/sanity/lib/queries';
import { SITE_NAME, SITE_TAGLINE, absoluteUrl } from '@/lib/site';
import { postPath } from '@/lib/urls';
import { ogImageUrl } from '@/lib/seo';

export const revalidate = 900;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function GET() {
  const items = await sanityFetch<{ title: string; slug: string; publishedAt: string; excerpt?: string; category?: string; image?: { ref?: string }; text?: string }[]>(FEED_QUERY, {}, ['posts']);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
<title>${esc(SITE_NAME)}</title>
<link>${absoluteUrl('/')}</link>
<description>${esc(SITE_TAGLINE)}</description>
<language>mr</language>
<atom:link href="${absoluteUrl('/feed.xml')}" rel="self" type="application/rss+xml"/>
${items
  .map((i) => {
    const link = absoluteUrl(postPath(i.slug));
    const desc = (i.excerpt || i.text || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    const img = ogImageUrl(i.image?.ref);
    return `<item>
<title>${esc(i.title)}</title>
<link>${link}</link>
<guid isPermaLink="true">${link}</guid>
<pubDate>${new Date(i.publishedAt).toUTCString()}</pubDate>
${i.category ? `<category>${esc(i.category)}</category>\n` : ''}<description>${esc(desc)}</description>
${img ? `<media:content url="${esc(img)}" medium="image"/>\n` : ''}</item>`;
  })
  .join('\n')}
</channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } });
}
