import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { sanityFetch } from '@/sanity/lib/client';
import { TAG_QUERY } from '@/sanity/lib/queries';
import { pageRange, type PostCardData } from '@/lib/data';
import { Listing } from '@/components/Listing';
import { tagPath, decodeParam } from '@/lib/urls';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 300;
// ISR: render on first request, then cache and refresh in the background / on Sanity webhook.
export async function generateStaticParams() {
  return [];
}
type Props = { params: Promise<{ slug: string }> };
type Data = { title: string; slug: string; description?: string; total: number; posts: PostCardData[] } | null;

const load = (slug: string, page: number) => sanityFetch<Data>(TAG_QUERY, { slug, ...pageRange(page) }, ['posts', 'taxonomy']);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = decodeParam((await params).slug);
  const data = await load(slug, 1);
  if (!data) return {};
  return buildMetadata({ title: data.title, description: data.description || `${data.title} - Online24Taas वरील लेख`, path: tagPath(data.slug) });
}

export default async function Page({ params }: Props) {
  const slug = decodeParam((await params).slug);
  const data = await load(slug, 1);
  if (!data) notFound();
  return <Listing heading={data.title} intro={data.description} crumbs={[{ name: data.title }]} posts={data.posts} total={data.total} page={1} href={(p) => tagPath(data.slug, p)} />;
}
