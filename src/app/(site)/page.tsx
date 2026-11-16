import { sanityFetch } from '@/sanity/lib/client';
import { CATEGORY_QUERY, LATEST_COUNT, LATEST_QUERY } from '@/sanity/lib/queries';
import { getSite, pageRange, parsePage, totalPages, type PostCardData } from '@/lib/data';
import { FeedItem, LeadCard, SecondaryCard, StandardCard } from '@/components/PostCard';
import { ContentLayout } from '@/components/ContentLayout';
import { Pagination } from '@/components/Pagination';
import { SectionHeader } from '@/components/SectionHeader';
import { WarliBand } from '@/components/Illustration';
import { blogPath, categoryPath } from '@/lib/urls';
import { buildMetadata } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';
import { SITE_NAME, SITE_TAGLINE, absoluteUrl } from '@/lib/site';
import { hasUsableImage, isPlaceholderCategory, take, toneFor } from '@/lib/present';

export const revalidate = 300;

export const metadata = buildMetadata({ title: `${SITE_NAME} - ${SITE_TAGLINE}`, description: 'ऑनलाईन 24 तास: मराठी बातम्या, माहिती आणि रंजक लेख.', path: '/' });

const POOL = 40;
const SECTION_MIN_COUNT = 6;
const MAX_SECTIONS = 5;
// Section order preference by category slug. Anything else follows by post count.
const PREFERRED = ['अध्यात्मिक', 'जरा-हटके', 'राशिभविष्य', 'news', 'आरोग्य', 'लव्ह-स्टोरीज', 'फिल्मी', 'स्पोर्ट्स', 'जोक्स'];

type CatData = { title: string; slug: string; posts: PostCardData[] } | null;

export default async function HomePage() {
  const page = parsePage(1);
  const { from, to } = pageRange(page);
  const site = await getSite();

  const candidates = site.categories.filter((c) => !isPlaceholderCategory(c) && c.count >= SECTION_MIN_COUNT);
  const rank = (slug: string) => { const i = PREFERRED.indexOf(slug.normalize('NFC')); return i === -1 ? 99 : i; };
  const chosen = [...candidates].sort((a, b) => rank(a.slug) - rank(b.slug) || b.count - a.count).slice(0, MAX_SECTIONS);

  const [pool, total, ...cats] = await Promise.all([
    sanityFetch<PostCardData[]>(LATEST_QUERY, { from: 0, to: POOL }, ['posts']),
    sanityFetch<number>(LATEST_COUNT, {}, ['posts']),
    ...chosen.map((c) => sanityFetch<CatData>(CATEGORY_QUERY, { slug: c.slug, from: 0, to: 16 }, ['posts', 'taxonomy'])),
  ]);

  // De-duplication: every post is placed at most once on the page, in this order of importance.
  const used = new Set<string>();
  const seenImages = new Set<string>();
  const seenTitles = new Set<string>();
  const distinctVisual = (p: PostCardData) => {
    if (!hasUsableImage(p)) return false;
    const img = p.image!.ref!;
    const title = p.title.trim();
    if (seenImages.has(img) || seenTitles.has(title)) return false;
    seenImages.add(img);
    seenTitles.add(title);
    return true;
  };
  const distinctTitle = (p: PostCardData) => {
    const title = p.title.trim();
    if (seenTitles.has(title)) return false;
    seenTitles.add(title);
    return true;
  };
  // Hero: newest posts that have a usable, distinct image (generic repeated graphics are not allowed to fill it).
  const heroPosts = take(pool, used, 4, distinctVisual);
  const [lead, ...secondary] = heroPosts;

  // Feed: the rest of page 1, so page 2 (/blog/page/2) continues exactly where this ends.
  const feed = take(pool.slice(from, to), used, POOL);
  const sidebarPosts = take(pool.slice(to), used, 6);

  const sections = chosen
    .map((c, i) => {
      const data = cats[i];
      if (!data) return null;
      const featured = take(data.posts, used, 1, distinctVisual);
      const rest = take(data.posts, used, 4, distinctTitle);
      if (!featured[0] || rest.length < 3) {
        // Not enough real posts: give them back so another block may use them.
        [...featured, ...rest].forEach((p) => used.delete(p._id));
        return null;
      }
      return { title: data.title, slug: data.slug, lead: featured[0], items: rest };
    })
    .filter((s): s is NonNullable<typeof s> => !!s);

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

      {lead && (
        <section aria-label="ठळक बातम्या" className="theme-wrapper pt-3 sm:pt-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] lg:gap-4">
            <LeadCard post={lead} priority className="lg:h-full" />
            {secondary.length > 0 && (
              <div className="snap-row -mx-[var(--gutter)] flex gap-3 overflow-x-auto px-[var(--gutter)] pb-1 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-1 lg:grid-rows-3 lg:gap-4 lg:pb-0">
                {secondary.map((p) => <SecondaryCard key={p._id} post={p} className="w-[78%] shrink-0 md:w-auto lg:h-full" />)}
              </div>
            )}
          </div>
        </section>
      )}

      <div className="theme-wrapper pt-9 sm:pt-12">
        <ContentLayout sidebarPosts={sidebarPosts} sidebarTitle="अलीकडील बातम्या">
          <section aria-labelledby="latest-heading">
            <SectionHeader id="latest-heading" title="ताज्या बातम्या" href={blogPath()} />
            {feed.length > 0 && (
              <>
                <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
                  {feed.slice(0, 2).map((p) => <StandardCard key={p._id} post={p} excerpt={false} className="reveal" />)}
                </div>
                <div className="mt-3 divide-y divide-line border-t border-line">
                  {feed.slice(2).map((p) => <FeedItem key={p._id} post={p} />)}
                </div>
              </>
            )}
            <Pagination page={page} pages={totalPages(total)} href={blogPath} />
          </section>
        </ContentLayout>
      </div>

      {sections.map((s) => {
        const tone = toneFor(s.slug);
        const spiritual = tone === 'saffron';
        return (
          <section
            key={s.slug}
            aria-labelledby={`sec-${s.slug}`}
            data-tone={tone}
            className={spiritual ? 'relative mt-14 overflow-hidden bg-saffron-soft py-10 sm:mt-16 sm:py-14' : 'mt-12 sm:mt-14'}
          >
            {spiritual && (
              <>
                <div aria-hidden className="grain pointer-events-none absolute inset-0" />
                <WarliBand className="absolute inset-x-0 bottom-0 h-14 text-saffron-ink/[0.14]" />
              </>
            )}
            <div className={`theme-wrapper relative ${spiritual ? 'pb-10' : 'border-t border-line pt-8'}`}>
              <SectionHeader id={`sec-${s.slug}`} title={s.title} href={categoryPath(s.slug)} tone={tone} />
              <div className="grid gap-x-8 gap-y-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:items-start">
                <StandardCard post={s.lead} className="reveal" excerpt />
                <div className={`divide-y ${spiritual ? 'divide-saffron/30' : 'divide-line'} md:-mt-3`}>
                  {s.items.map((p) => <FeedItem key={p._id} post={p} />)}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}
