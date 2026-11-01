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
import { SanityImage } from '@/components/SanityImage';
import { PortableTextRenderer } from '@/components/PortableTextRenderer';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ShareButtons } from '@/components/ShareButtons';
import { JsonLd } from '@/components/JsonLd';
import { ContentLayout, CardGrid } from '@/components/ContentLayout';
import { PostCard } from '@/components/PostCard';

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

export default async function PostPage({ params }: Props) {
  const slug = decodeParam((await params).slug);
  const post = await load(slug);
  if (!post) notFound();
  const catIds = (post.categories ?? []).map((c) => c._id);
  const [adjacent, related] = await Promise.all([
    sanityFetch<{ prev?: { title: string; slug: string }; next?: { title: string; slug: string } }>(ADJACENT_QUERY, { at: post.publishedAt }, ['posts']),
    catIds.length ? sanityFetch<PostCardData[]>(RELATED_QUERY, { id: post._id, cats: catIds.map((id) => id) }, ['posts']) : Promise.resolve([]),
  ]);
  const url = absoluteUrl(postPath(post.slug));
  const cat = post.categories?.[0];
  return (
    <div className="theme-wrapper mt-[30px]">
      <ContentLayout>
        <article className="min-w-0">
          <header>
            <h1 className="text-[length:var(--text-xl)] leading-[1.4] font-bold [overflow-wrap:anywhere]">{post.title}</h1>
            <p className="mt-3 flex flex-wrap items-center text-[0.85rem] font-medium">
              {post.author && (
                <>
                  <Link href={post.author.slug ? authorPath(post.author.slug) : '#'} className="hover:text-primary">{post.author.name}</Link>
                  <span aria-hidden className="mx-1.5 inline-block size-[3px] bg-ink" />
                </>
              )}
              <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
            </p>
            <Breadcrumbs items={[...(cat ? [{ name: cat.title, href: categoryPath(cat.slug) }] : []), { name: post.title }]} />
          </header>
          {post.image?.ref && (
            <figure className="my-5">
              <SanityImage imageRef={post.image.ref} alt={post.image.alt || post.title} sizes="(min-width: 1024px) 860px, 100vw" priority fetchPriority="high" className="h-auto w-full" />
              {post.image.caption && <figcaption className="mt-2 text-center text-sm text-neutral-600">{post.image.caption}</figcaption>}
            </figure>
          )}
          <PortableTextRenderer value={post.body} />
          <footer className="mt-8 space-y-2 border-t border-black/15 pt-5">
            {!!post.categories?.length && (
              <p className="flex flex-wrap gap-x-2 gap-y-1 text-[0.95rem]">
                <span className="font-bold">विभाग:</span>
                {post.categories.map((c, i) => (
                  <span key={c._id}><Link href={categoryPath(c.slug)} className="hover:text-primary">{c.title}</Link>{i < post.categories!.length - 1 ? ',' : ''}</span>
                ))}
              </p>
            )}
            {!!post.tags?.length && (
              <p className="flex flex-wrap gap-2 text-[0.95rem]">
                <span className="font-bold">टॅग:</span>
                {post.tags.map((t) => <Link key={t.slug} href={tagPath(t.slug)} className="border border-black/20 px-2 py-0.5 text-[0.85rem] hover:border-primary hover:text-primary">{t.title}</Link>)}
              </p>
            )}
            <div className="pt-2"><ShareButtons url={url} title={post.title} /></div>
          </footer>
          <nav aria-label="मागील/पुढील लेख" className="mt-8 grid gap-4 border-y border-black/15 py-5 text-[0.95rem] sm:grid-cols-2">
            <div>{adjacent.prev && <Link rel="prev" href={postPath(adjacent.prev.slug)} className="block hover:text-primary"><span className="block text-[0.8rem] text-neutral-600">मागील:</span><span className="font-semibold [overflow-wrap:anywhere]">{adjacent.prev.title}</span></Link>}</div>
            <div className="sm:text-right">{adjacent.next && <Link rel="next" href={postPath(adjacent.next.slug)} className="block hover:text-primary"><span className="block text-[0.8rem] text-neutral-600">पुढील:</span><span className="font-semibold [overflow-wrap:anywhere]">{adjacent.next.title}</span></Link>}</div>
          </nav>
          {related.length > 0 && (
            <section className="mt-10" aria-labelledby="related">
              <h2 id="related" className="section-title">संबंधित लेख</h2>
              <CardGrid>{related.slice(0, 3).map((p) => <PostCard key={p._id} post={p} />)}</CardGrid>
            </section>
          )}
        </article>
      </ContentLayout>
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
    </div>
  );
}
