import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { sanityFetch } from '@/sanity/lib/client';
import { PAGE_QUERY } from '@/sanity/lib/queries';
import { decodeParam, pagePath } from '@/lib/urls';
import { slugTag } from '@/lib/cache-tags';
import { buildMetadata, plainDescription } from '@/lib/seo';
import { PortableTextRenderer } from '@/components/PortableTextRenderer';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { WarliBand } from '@/components/Illustration';
import { pageLabel } from '@/lib/labels';

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
  const title = pageLabel(page.slug, page.title);
  return (
    <div className="theme-wrapper pt-3 sm:pt-6">
      <article className="mx-auto max-w-[46rem]">
        <header className="relative overflow-hidden border-b border-line pb-6">
          <Breadcrumbs items={[{ name: page.title, label: title }]} className="mb-3" />
          <h1 className="hl text-[1.875rem] sm:text-[2.5rem]">{title}</h1>
          <WarliBand className="mt-4 h-10 text-saffron-ink/[0.16]" />
        </header>
        <div className="mt-6">
          <PortableTextRenderer value={page.body} />
        </div>
      </article>
    </div>
  );
}
