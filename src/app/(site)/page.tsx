import { sanityFetch } from '@/sanity/lib/client';
import { BANNER_QUERY, LATEST_COUNT, LATEST_QUERY } from '@/sanity/lib/queries';
import { pageRange, parsePage, totalPages, type PostCardData } from '@/lib/data';
import { OverlayTile, PostCard } from '@/components/PostCard';
import { ContentLayout, CardGrid } from '@/components/ContentLayout';
import { Pagination } from '@/components/Pagination';
import { blogPath } from '@/lib/urls';
import { buildMetadata } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';
import { SITE_NAME, SITE_TAGLINE, absoluteUrl } from '@/lib/site';

export const revalidate = 300;

export const metadata = buildMetadata({ title: `${SITE_NAME} - ${SITE_TAGLINE}`, description: 'ऑनलाईन 24 तास: मराठी बातम्या, माहिती आणि रंजक लेख.', path: '/' });

/**
 * Grid placement for the banner so it never leaves holes: Adore News "style-1" is a 4-column grid whose first
 * item spans 2×2. The original relied on exactly 5 posts; with 1-4 posts the remaining tiles stretch to fill.
 */
function bannerClass(count: number, i: number): string {
  if (i === 0) return count === 1 ? 'md:col-span-2 lg:col-span-4' : 'md:col-span-2 md:row-span-2';
  if (count === 2) return 'md:col-span-2 lg:col-span-2 lg:row-span-2';
  if (count === 3) return 'lg:row-span-2';
  if (count === 4 && i === 3) return 'md:col-span-2';
  return '';
}

export default async function HomePage() {
  const page = parsePage(1);
  const { from, to } = pageRange(page);
  const [banner, latest, total] = await Promise.all([
    sanityFetch<PostCardData[] | null>(BANNER_QUERY, {}, ['site', 'posts']),
    sanityFetch<PostCardData[]>(LATEST_QUERY, { from, to }, ['posts']),
    sanityFetch<number>(LATEST_COUNT, {}, ['posts']),
  ]);
  // Banner = posts chosen in Site settings (WordPress theme "banner section"); fall back to the newest with images.
  const tiles = (banner?.filter(Boolean).length ? banner.filter(Boolean) : latest.filter((p) => p.image?.ref)).slice(0, 5);
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            { '@type': 'WebSite', '@id': absoluteUrl('/#website'), url: absoluteUrl('/'), name: SITE_NAME, description: SITE_TAGLINE, inLanguage: 'mr', potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${absoluteUrl('/search')}?q={search_term_string}` }, 'query-input': 'required name=search_term_string' } },
            { '@type': 'Organization', '@id': absoluteUrl('/#organization'), name: SITE_NAME, url: absoluteUrl('/') },
          ],
        }}
      />
      <h1 className="sr-only">{SITE_NAME} - {SITE_TAGLINE}</h1>
      {tiles.length > 0 && (
        <section aria-label="ठळक बातम्या" className="theme-wrapper mt-2.5">
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-4">
            {tiles.map((p, i) => <OverlayTile key={p._id} post={p} large={i === 0} priority={i < 2} className={bannerClass(tiles.length, i)} />)}
          </div>
        </section>
      )}
      <div className="theme-wrapper mt-[30px]">
        <ContentLayout>
          <section aria-labelledby="latest-heading">
            <h2 id="latest-heading" className="section-title">ताज्या बातम्या</h2>
            <CardGrid>{latest.map((p, i) => <PostCard key={p._id} post={p} priority={i < 3} />)}</CardGrid>
            <Pagination page={page} pages={totalPages(total)} href={blogPath} />
          </section>
        </ContentLayout>
      </div>
    </>
  );
}
