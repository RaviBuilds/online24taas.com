import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { sanityFetch } from '@/sanity/lib/client';
import { LATEST_COUNT, LATEST_QUERY } from '@/sanity/lib/queries';
import { pageRange, parsePage, type PostCardData } from '@/lib/data';
import { Listing } from '@/components/Listing';
import { blogPath } from '@/lib/urls';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 300;
type Props = { params: Promise<{ n: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = parsePage((await params).n);
  return buildMetadata({ title: `सर्व बातम्या - पृष्ठ ${page}`, path: blogPath(page) });
}

export default async function BlogPage({ params }: Props) {
  const raw = (await params).n;
  const page = parsePage(raw);
  if (!/^\d+$/.test(raw)) notFound();
  if (page === 1) redirect('/blog');
  const { from, to } = pageRange(page);
  const [posts, total] = await Promise.all([sanityFetch<PostCardData[]>(LATEST_QUERY, { from, to }, ['posts']), sanityFetch<number>(LATEST_COUNT, {}, ['posts'])]);
  return <Listing heading="सर्व बातम्या" crumbs={[{ name: 'बातम्या', href: '/blog' }, { name: `पृष्ठ ${page}` }]} posts={posts} total={total} page={page} href={blogPath} />;
}
