import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { sanityFetch } from '@/sanity/lib/client';
import { PAGE_QUERY } from '@/sanity/lib/queries';
import { decodeParam, pagePath } from '@/lib/urls';
import { buildMetadata } from '@/lib/seo';
import { PortableTextRenderer } from '@/components/PortableTextRenderer';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export const revalidate = 300;
type Props = { params: Promise<{ slug: string }> };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PageData = { title: string; slug: string; body?: any[]; seo?: { seoTitle?: string; metaDescription?: string; canonicalUrl?: string; noIndex?: boolean } } | null;

const load = (slug: string) => sanityFetch<PageData>(PAGE_QUERY, { slug }, ['pages', `page:${slug}`]);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await load(decodeParam((await params).slug));
  if (!page) return {};
  return buildMetadata({ title: page.seo?.seoTitle || page.title, description: page.seo?.metaDescription, path: pagePath(page.slug), noIndex: page.seo?.noIndex, canonicalOverride: page.seo?.canonicalUrl });
}

export default async function StaticPage({ params }: Props) {
  const page = await load(decodeParam((await params).slug));
  if (!page) notFound();
  return (
    <div className="theme-wrapper max-w-3xl py-6">
      <Breadcrumbs items={[{ name: page.title }]} />
      <h1 className="mb-4 text-2xl font-bold md:text-3xl">{page.title}</h1>
      <PortableTextRenderer value={page.body} />
    </div>
  );
}
