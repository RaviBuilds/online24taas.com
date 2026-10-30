import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { sanityFetch } from '@/sanity/lib/client';
import { TAG_QUERY } from '@/sanity/lib/queries';
import { pageRange, parsePageStrict, type PostCardData } from '@/lib/data';
import { Listing } from '@/components/Listing';
import { tagPath, decodeParam } from '@/lib/urls';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 300;
type Props = { params: Promise<{ slug: string; n: string }> };
type Data = { title: string; slug: string; description?: string; total: number; posts: PostCardData[] } | null;

const load = (slug: string, page: number) => sanityFetch<Data>(TAG_QUERY, { slug, ...pageRange(page) }, ['posts', 'taxonomy']);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: s, n } = await params;
  const page = parsePageStrict(n);
  if (!page) return {};
  const data = await load(decodeParam(s), page);
  if (!data) return {};
  return buildMetadata({ title: `${data.title} - पृष्ठ ${page}`, path: tagPath(data.slug, page) });
}

export default async function Page({ params }: Props) {
  const { slug: s, n } = await params;
  const page = parsePageStrict(n);
  if (!page) notFound();
  const slug = decodeParam(s);
  if (page === 1) redirect(tagPath(slug));
  const data = await load(slug, page);
  if (!data) notFound();
  return <Listing heading={data.title} intro={data.description} crumbs={[{ name: data.title, href: tagPath(data.slug) }, { name: `पृष्ठ ${page}` }]} posts={data.posts} total={data.total} page={page} href={(p) => tagPath(data.slug, p)} />;
}
