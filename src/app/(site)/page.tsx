import Link from 'next/link';
import { sanityFetch } from '@/sanity/lib/client';
import { BANNER_QUERY, LATEST_COUNT, LATEST_QUERY } from '@/sanity/lib/queries';
import { pageRange, parsePage, totalPages, type PostCardData } from '@/lib/data';
import { OverlayTile, PostCard } from '@/components/PostCard';
import { Sidebar } from '@/components/Sidebar';
import { Pagination } from '@/components/Pagination';
import { blogPath } from '@/lib/urls';
import { buildMetadata } from '@/lib/seo';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/site';

export const revalidate = 300;

export const metadata = buildMetadata({ title: `${SITE_NAME} - ${SITE_TAGLINE}`, description: 'ऑनलाईन 24 तास: मराठी बातम्या, माहिती आणि रंजक लेख.', path: '/' });

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
  const [lead, ...rest] = tiles;
  return (
    <div className="theme-wrapper py-6">
      {lead && (
        <section aria-label="ठळक बातम्या" className="grid gap-2 md:grid-cols-2 md:grid-rows-2 lg:grid-cols-[2fr_1fr_1fr]">
          <OverlayTile post={lead} large priority />
          {rest.slice(0, 4).map((p) => <OverlayTile key={p._id} post={p} />)}
        </section>
      )}
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_300px]">
        <section aria-labelledby="latest-heading">
          <h2 id="latest-heading" className="section-title">ताज्या बातम्या</h2>
          {latest.map((p, i) => <PostCard key={p._id} post={p} priority={i < 2} />)}
          <Pagination page={page} pages={totalPages(total)} href={blogPath} />
          <p className="text-center"><Link href="/blog" className="font-semibold text-primary">सर्व बातम्या पहा »</Link></p>
        </section>
        <Sidebar />
      </div>
    </div>
  );
}
