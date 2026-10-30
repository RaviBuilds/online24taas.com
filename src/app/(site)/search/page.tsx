import type { Metadata } from 'next';
import { sanityFetch } from '@/sanity/lib/client';
import { SEARCH_QUERY } from '@/sanity/lib/queries';
import { pageRange, parsePage, type PostCardData } from '@/lib/data';
import { Listing } from '@/components/Listing';
import { searchPath } from '@/lib/urls';
import { toMatchQuery } from '@/lib/search';

type Props = { searchParams: Promise<{ q?: string; page?: string }> };

// Search results are never indexed (thin, infinite URL space).
export const metadata: Metadata = { title: 'शोध', robots: { index: false, follow: true } };

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim().slice(0, 100);
  const page = parsePage(sp.page);
  const match = toMatchQuery(q);
  const data = match
    ? await sanityFetch<{ total: number; posts: PostCardData[] }>(SEARCH_QUERY, { q: match, ...pageRange(page) }, ['posts'])
    : { total: 0, posts: [] };
  return (
    <Listing
      heading={q ? `शोध: “${q}”` : 'शोध'}
      crumbs={[{ name: 'शोध' }]}
      posts={data.posts}
      total={data.total}
      page={page}
      href={(p) => searchPath(q, p)}
      empty={q ? 'या शब्दासाठी कोणताही निकाल आढळला नाही.' : 'शोधण्यासाठी एखादा शब्द लिहा.'}
    />
  );
}
