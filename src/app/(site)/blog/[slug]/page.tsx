import Link from '@/components/AppLink';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { sanityFetch } from '@/sanity/lib/client';
import { ADJACENT_QUERY, POST_QUERY, RELATED_QUERY } from '@/sanity/lib/queries';
import type { PostCardData } from '@/lib/data';
import { decodeParam, authorPath, categoryPath, postPath, tagPath } from '@/lib/urls';
import { formatDate } from '@/lib/format';
import { slugTag } from '@/lib/cache-tags';
import { buildMetadata, ogImageUrl, plainDescription } from '@/lib/seo';
import { SITE_NAME, absoluteUrl } from '@/lib/site';
import { CoverImage } from '@/components/CoverImage';
import { PortableTextRenderer } from '@/components/PortableTextRenderer';
import { Breadcrumbs, type Crumb } from '@/components/Breadcrumbs';
import { ShareBar, ShareButtons } from '@/components/ShareButtons';
import { ReadingProgress } from '@/components/ReadingProgress';
import { JsonLd } from '@/components/JsonLd';
import { ContentLayout } from '@/components/ContentLayout';
import { StandardCard } from '@/components/PostCard';
import { SectionHeader } from '@/components/SectionHeader';
import { Icon } from '@/components/Icon';
import { bylineName, formatNumber, hasRealAuthor, isPlaceholderCategory, primaryCategory, realCategories, toneFor } from '@/lib/present';

export const revalidate = 300;
// ISR: render on first request, then cache and refresh in the background / on Sanity webhook.
export async function generateStaticParams() {
  return [];
}
type Props = { params: Promise<{ slug: string }> };

interface Post {
  _id: string;
  title: string;
  slug: string;
  publishedAt: string;
  modifiedAt?: string;
  excerpt?: string;
  image?: { ref?: string; alt?: string; caption?: string } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any[] | null;
  categories?: { _id: string; title: string; slug: string }[] | null;
  tags?: { title: string; slug: string }[] | null;
  author?: { name: string; slug?: string } | null;
  seo?: { seoTitle?: string; metaDescription?: string; canonicalUrl?: string; noIndex?: boolean; ogRef?: string } | null;
}

const load = (slug: string) => sanityFetch<Post | null>(POST_QUERY, { slug }, ['posts', slugTag('post', slug)]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const bodyText = (body?: any[] | null) => (body ?? []).filter((b) => b._type === 'block').map((b) => b.children?.map((c: { text: string }) => c.text).join('')).join(' ');

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await load(decodeParam((await params).slug));
  if (!post) return {};
  const description = post.seo?.metaDescription || plainDescription(post.excerpt) || plainDescription(bodyText(post.body)) || `${post.title} - ${SITE_NAME}`;
  return buildMetadata({
    title: post.seo?.seoTitle || post.title,
    description,
    path: postPath(post.slug),
    image: ogImageUrl(post.seo?.ogRef || post.image?.ref),
    type: 'article',
    noIndex: post.seo?.noIndex,
    publishedTime: post.publishedAt,
    modifiedTime: post.modifiedAt,
    canonicalOverride: post.seo?.canonicalUrl,
  });
}

function NavCard({ dir, post }: { dir: 'prev' | 'next'; post?: { title: string; slug: string } }) {
  if (!post) return <div className="max-sm:hidden" />;
  const prev = dir === 'prev';
  return (
    <Link rel={dir} href={postPath(post.slug)} className={`group flex min-h-24 flex-col justify-center gap-1 rounded-[var(--radius-img)] border border-line bg-surface p-4 transition-[border-color,scale] duration-150 hover:border-brand active:scale-[0.985] ${prev ? '' : 'sm:items-end sm:text-right'}`}>
      <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-bold text-brand-dark">
        {prev && <Icon name="arrowLeft" className="size-4" />}
        {prev ? 'मागील लेख' : 'पुढील लेख'}
        {!prev && <Icon name="arrowRight" className="size-4" />}
      </span>
      <span className="hl line-clamp-3 text-[1rem] font-bold">{post.title}</span>
    </Link>
  );
}

export default async function PostPage({ params }: Props) {
  const slug = decodeParam((await params).slug);
  const post = await load(slug);
  if (!post) notFound();
  const real = realCategories(post.categories);
  // Related stories come from the real categories; the placeholder "All" is only a last resort.
  const relCats = (real.length ? real : post.categories ?? []).map((c) => c._id);
  const [adjacent, related] = await Promise.all([
    sanityFetch<{ prev?: { title: string; slug: string }; next?: { title: string; slug: string } }>(ADJACENT_QUERY, { at: post.publishedAt }, ['posts']),
    relCats.length ? sanityFetch<PostCardData[]>(RELATED_QUERY, { id: post._id, cats: relCats }, ['posts']) : Promise.resolve([]),
  ]);
  const url = absoluteUrl(postPath(post.slug));
  const cat = primaryCategory(post.categories);
  const first = post.categories?.[0];
  // Breadcrumb: the real category if there is one. A lone "All" stays in the structured data but is never shown.
  const crumbCat = cat ?? first;
  const crumbs: Crumb[] = [
    ...(crumbCat ? [{ name: crumbCat.title, href: categoryPath(crumbCat.slug), hidden: isPlaceholderCategory(crumbCat) }] : []),
    { name: post.title },
  ];
  const words = bodyText(post.body).split(/\s+/).filter(Boolean).length;
  const minutes = words >= 60 ? Math.max(1, Math.ceil(words / 180)) : 0;
  const showAuthorLink = hasRealAuthor(post.author?.name) && post.author?.slug;
  const relatedList = related.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <>
      <ReadingProgress target="post-article" />
      <div className="theme-wrapper pt-3 sm:pt-6" data-tone={toneFor(cat?.slug)}>
        <ContentLayout sidebarTitle="ताज्या बातम्या">
          <article id="post-article" className="mx-auto min-w-0 max-w-[46rem] lg:mx-0">
            <header>
              <Breadcrumbs items={crumbs} className="mb-3" />
              {cat && (
                <Link href={categoryPath(cat.slug)} className="label-dot mb-2 inline-flex min-h-8 items-center">{cat.title}</Link>
              )}
              <h1 className="hl text-[1.75rem] sm:text-[2.25rem] lg:text-[2.5rem]">{post.title}</h1>
              <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.9rem] text-muted">
                {showAuthorLink ? (
                  <Link href={authorPath(post.author!.slug!)} className="font-bold text-ink hover:text-brand-dark">{post.author!.name}</Link>
                ) : (
                  <span className="font-bold text-ink">{bylineName(post.author?.name)}</span>
                )}
                <span aria-hidden className="size-1 rounded-full bg-line" />
                <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                {minutes > 0 && (
                  <>
                    <span aria-hidden className="size-1 rounded-full bg-line" />
                    <span className="inline-flex items-center gap-1"><Icon name="clock" className="size-4" /> {formatNumber(minutes)} मिनिटे वाचन</span>
                  </>
                )}
              </p>
            </header>

            {post.image?.ref && (
              <figure className="-mx-[var(--gutter)] mt-5 sm:mx-0 sm:mt-6">
                <div className="relative aspect-[16/9] overflow-hidden bg-ink-2 sm:rounded-[var(--radius-img)]">
                  <CoverImage imageRef={post.image.ref} alt={post.image.alt || post.title} ratio={16 / 9} sizes="(min-width: 1024px) 736px, 100vw" priority />
                </div>
                {post.image.caption && <figcaption className="mt-2 px-[var(--gutter)] text-[0.85rem] leading-6 text-muted sm:px-0">{post.image.caption}</figcaption>}
              </figure>
            )}

            <div className="mt-7">
              <PortableTextRenderer value={post.body} />
            </div>

            <footer className="mt-10 space-y-6 border-t border-line pt-6">
              {!!real.length && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[0.9375rem] font-extrabold">विभाग</span>
                  {real.map((c) => (
                    <Link key={c._id} href={categoryPath(c.slug)} data-tone={toneFor(c.slug)} className="label-dot min-h-9 rounded-full border border-line bg-surface px-3.5 hover:border-brand">{c.title}</Link>
                  ))}
                </div>
              )}
              {!!post.tags?.length && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[0.9375rem] font-extrabold">टॅग</span>
                  {post.tags.map((t) => <Link key={t.slug} href={tagPath(t.slug)} className="inline-flex min-h-9 items-center rounded-full bg-saffron-soft px-3.5 text-[0.875rem] font-semibold text-saffron-ink hover:bg-saffron hover:text-ink">{t.title}</Link>)}
                </div>
              )}
              <ShareButtons url={url} title={post.title} />
            </footer>

            {(adjacent.prev || adjacent.next) && (
              <nav aria-label="मागील आणि पुढील लेख" className="mt-10 grid gap-3 sm:grid-cols-2">
                <NavCard dir="prev" post={adjacent.prev} />
                <NavCard dir="next" post={adjacent.next} />
              </nav>
            )}

            {relatedList.length > 0 && (
              <section className="mt-12" aria-labelledby="related">
                <SectionHeader id="related" title="संबंधित लेख" tone={toneFor(cat?.slug)} />
                <div className="snap-row -mx-[var(--gutter)] flex gap-4 overflow-x-auto px-[var(--gutter)] pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
                  {relatedList.map((p) => <StandardCard key={p._id} post={p} excerpt={false} className="w-[72%] shrink-0 sm:w-auto" />)}
                </div>
              </section>
            )}
          </article>
        </ContentLayout>
      </div>
      <ShareBar url={url} title={post.title} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: post.title,
          datePublished: post.publishedAt,
          dateModified: post.modifiedAt || post.publishedAt,
          inLanguage: 'mr',
          mainEntityOfPage: url,
          url,
          ...(post.image?.ref ? { image: [ogImageUrl(post.image.ref)] } : {}),
          author: { '@type': 'Person', name: post.author?.name || SITE_NAME },
          publisher: { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/') },
          ...(post.categories?.length ? { articleSection: post.categories.map((c) => c.title) } : {}),
          ...(post.tags?.length ? { keywords: post.tags.map((t) => t.title).join(', ') } : {}),
        }}
      />
    </>
  );
}
