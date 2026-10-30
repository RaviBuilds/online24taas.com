import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { sanityFetch } from '@/sanity/lib/client';
import { CATEGORY_QUERY } from '@/sanity/lib/queries';
import { pageRange, parsePage, type PostCardData } from '@/lib/data';
import { Listing } from '@/components/Listing';
import { categoryPath, decodeParam } from '@/lib/urls';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 300;
type Props = { params: Promise<{ slug: string; n: string }> };
type Data = { title: string; slug: string; description?: string; total: number; posts: PostCardData[] } | null;

const load = (slug: string, page: number) => sanityFetch<Data>(CATEGORY_QUERY, { slug, ...pageRange(page) }, ['posts', 'taxonomy']);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: s, n } = await params;
  const page = parsePage(n);
  const data = await load(decodeParam(s), page);
  if (!data) return {};
  return buildMetadata({ title: `${data.title} - पृष्ठ ${page}`, path: categoryPath(data.slug, page) });
}

export default async function Page({ params }: Props) {
  const { slug: s, n } = await params;
  if (!/^\d+$/.test(n)) notFound();
  const page = parsePage(n);
  const slug = decodeParam(s);
  if (page === 1) redirect(categoryPath(slug));
  const data = await load(slug, page);
  if (!data) notFound();
  return <Listing heading={data.title} intro={data.description} crumbs={[{ name: data.title, href: categoryPath(data.slug) }, { name: `पृष्ठ ${page}` }]} posts={data.posts} total={data.total} page={page} href={(p) => categoryPath(data.slug, p)} />;
}
