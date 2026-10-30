import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { sanityFetch } from '@/sanity/lib/client';
import { AUTHOR_QUERY } from '@/sanity/lib/queries';
import { pageRange, parsePage, type PostCardData } from '@/lib/data';
import { Listing } from '@/components/Listing';
import { authorPath, decodeParam } from '@/lib/urls';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 300;
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };
type Data = { name: string; slug: string; bio?: string; total: number; posts: PostCardData[] } | null;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = decodeParam((await params).slug);
  const data = await sanityFetch<Data>(AUTHOR_QUERY, { slug, ...pageRange(1) }, ['posts']);
  return data ? buildMetadata({ title: data.name, path: authorPath(data.slug) }) : {};
}

export default async function AuthorPage({ params, searchParams }: Props) {
  const slug = decodeParam((await params).slug);
  const page = parsePage((await searchParams).page);
  const data = await sanityFetch<Data>(AUTHOR_QUERY, { slug, ...pageRange(page) }, ['posts']);
  if (!data) notFound();
  return <Listing heading={data.name} intro={data.bio} crumbs={[{ name: data.name }]} posts={data.posts} total={data.total} page={page} href={(p) => `${authorPath(data.slug)}${p > 1 ? `?page=${p}` : ''}`} />;
}
