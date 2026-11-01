import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { sanityFetch } from '@/sanity/lib/client';
import { PAGE_QUERY } from '@/sanity/lib/queries';
import { decodeParam, pagePath } from '@/lib/urls';
import { slugTag } from '@/lib/cache-tags';
import { buildMetadata, plainDescription } from '@/lib/seo';
import { PortableTextRenderer } from '@/components/PortableTextRenderer';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ContentLayout } from '@/components/ContentLayout';

export const revalidate = 300;
// ISR: render on first request, then cache and refresh in the background / on Sanity webhook.
export async function generateStaticParams() {
  return [];
}
type Props = { params: Promise<{ slug: string }> };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PageData = { title: string; slug: string; body?: any[]; seo?: { seoTitle?: string; metaDescription?: string; canonicalUrl?: string; noIndex?: boolean } } | null;

const load = (slug: string) => sanityFetch<PageData>(PAGE_QUERY, { slug }, ['pages', slugTag('page', slug)]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const bodyText = (body?: any[]) => (body ?? []).filter((b) => b._type === 'block').map((b) => b.children?.map((c: { text: string }) => c.text).join('')).join(' ');

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await load(decodeParam((await params).slug));
  if (!page) return {};
  return buildMetadata({ title: page.seo?.seoTitle || page.title, description: page.seo?.metaDescription || plainDescription(bodyText(page.body)), path: pagePath(page.slug), noIndex: page.seo?.noIndex, canonicalOverride: page.seo?.canonicalUrl });
}

export default async function StaticPage({ params }: Props) {
  const page = await load(decodeParam((await params).slug));
  if (!page) notFound();
  return (
    <div className="theme-wrapper mt-[30px]">
      <ContentLayout>
        <article className="min-w-0">
          <h1 className="text-[length:var(--text-xl)] leading-[1.4] font-bold [overflow-wrap:anywhere]">{page.title}</h1>
          <Breadcrumbs items={[{ name: page.title }]} />
          <PortableTextRenderer value={page.body} />
        </article>
      </ContentLayout>
    </div>
  );
}
