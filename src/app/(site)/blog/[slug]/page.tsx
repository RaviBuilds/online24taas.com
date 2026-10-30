import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { sanityFetch } from '@/sanity/lib/client';
import { ADJACENT_QUERY, POST_QUERY, RELATED_QUERY } from '@/sanity/lib/queries';
import type { PostCardData } from '@/lib/data';
import { decodeParam, authorPath, categoryPath, postPath, tagPath } from '@/lib/urls';
import { formatDate } from '@/lib/format';
import { buildMetadata, ogImageUrl, plainDescription } from '@/lib/seo';
import { SITE_NAME, absoluteUrl } from '@/lib/site';
import { SanityImage } from '@/components/SanityImage';
import { PortableTextRenderer } from '@/components/PortableTextRenderer';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ShareButtons } from '@/components/ShareButtons';
import { JsonLd } from '@/components/JsonLd';
import { Sidebar } from '@/components/Sidebar';
import { MiniCard } from '@/components/PostCard';

export const revalidate = 300;
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

const load = (slug: string) => sanityFetch<Post | null>(POST_QUERY, { slug }, ['posts', `post:${slug}`]);

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
    <div className="theme-wrapper py-6">
      <Breadcrumbs items={[...(cat ? [{ name: cat.title, href: categoryPath(cat.slug) }] : []), { name: post.title }]} />
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <article>
          <header>
            {cat && <Link href={categoryPath(cat.slug)} className="mb-2 inline-block bg-primary px-2 py-0.5 text-xs font-medium text-white">{cat.title}</Link>}
            <h1 className="text-2xl leading-snug font-bold md:text-4xl">{post.title}</h1>
            <p className="mt-2 text-sm text-neutral-600">
              <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
              {post.author && <> · <Link href={post.author.slug ? authorPath(post.author.slug) : '#'} className="hover:text-primary">{post.author.name}</Link></>}
            </p>
          </header>
          {post.image?.ref && (
            <figure className="my-5">
              <SanityImage imageRef={post.image.ref} alt={post.image.alt || post.title} sizes="(min-width: 1024px) 860px, 100vw" priority className="h-auto w-full" />
              {post.image.caption && <figcaption className="mt-2 text-center text-sm text-neutral-600">{post.image.caption}</figcaption>}
            </figure>
          )}
          <PortableTextRenderer value={post.body} />
          <div className="mt-8 space-y-4 border-t border-neutral-200 pt-5">
            {!!post.tags?.length && (
              <p className="flex flex-wrap gap-2 text-sm">
                <span className="font-semibold">टॅग:</span>
                {post.tags.map((t) => <Link key={t.slug} href={tagPath(t.slug)} className="border border-neutral-300 px-2 py-0.5 hover:border-primary hover:text-primary">{t.title}</Link>)}
              </p>
            )}
            <ShareButtons url={url} title={post.title} />
          </div>
          <nav aria-label="मागील/पुढील लेख" className="mt-8 grid gap-4 border-t border-neutral-200 pt-5 text-sm sm:grid-cols-2">
            <div>{adjacent.prev && <Link rel="prev" href={postPath(adjacent.prev.slug)} className="hover:text-primary">‹ {adjacent.prev.title}</Link>}</div>
            <div className="sm:text-right">{adjacent.next && <Link rel="next" href={postPath(adjacent.next.slug)} className="hover:text-primary">{adjacent.next.title} ›</Link>}</div>
          </nav>
          {related.length > 0 && (
            <section className="mt-10" aria-labelledby="related">
              <h2 id="related" className="section-title">संबंधित लेख</h2>
              <div className="grid gap-x-6 sm:grid-cols-2">{related.map((p) => <MiniCard key={p._id} post={p} />)}</div>
            </section>
          )}
        </article>
        <Sidebar />
      </div>
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
