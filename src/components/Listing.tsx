import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { ListCard, LeadCard } from './PostCard';
import { Pagination } from './Pagination';
import { ContentLayout, CardGrid } from './ContentLayout';
import { Breadcrumbs, type Crumb } from './Breadcrumbs';
import { Illustration } from './Illustration';
import type { PostCardData } from '@/lib/data';
import { totalPages } from '@/lib/data';
import { formatNumber, hasUsableImage, toneFor } from '@/lib/present';

interface Props {
  heading: string;
  intro?: string | null;
  crumbs: Crumb[];
  posts: PostCardData[];
  total: number;
  page: number;
  href: (p: number) => string;
  empty?: string;
  /** Category slug, used only to pick the section tint. */
  toneSlug?: string;
  kicker?: string;
  /** Optional block under the page header, e.g. the search form. */
  top?: ReactNode;
}

/** Shared archive layout: page header, lead card on the first page, card grid, pagination, sidebar. */
export function Listing({ heading, intro, crumbs, posts, total, page, href, empty = 'कोणतीही बातमी आढळली नाही.', toneSlug, kicker, top }: Props) {
  if (page > 1 && posts.length === 0) notFound();
  const lead = page === 1 && posts.length >= 3 && hasUsableImage(posts[0]) ? posts[0] : null;
  const rest = lead ? posts.slice(1) : posts;
  return (
    <div className="theme-wrapper pt-4 pb-4 sm:pt-6">
      <ContentLayout>
        <section data-listing data-tone={toneFor(toneSlug)}>
          <header className="mb-6 border-b border-line pb-5">
            <Breadcrumbs items={crumbs} className="mb-2" />
            {kicker && <p className="label-dot mb-1">{kicker}</p>}
            <h1 className="hl text-[1.75rem] sm:text-[2.25rem]">{heading}</h1>
            {intro && <p className="mt-2 max-w-prose text-muted">{intro}</p>}
            <p className="mt-2 text-[0.875rem] text-muted">{formatNumber(total)} लेख{page > 1 ? ` · पृष्ठ ${formatNumber(page)}` : ''}</p>
          </header>
          {top}
          {posts.length === 0 ? (
            <div className="grid place-items-center gap-3 py-12 text-center">
              <Illustration name="empty" className="w-56 text-ink/70" />
              <p className="text-lg font-semibold">{empty}</p>
            </div>
          ) : (
            <>
              {lead && <LeadCard post={lead} priority className="mb-6" />}
              <CardGrid>{rest.map((p, i) => <ListCard key={p._id} post={p} priority={!lead && i < 2} />)}</CardGrid>
            </>
          )}
          <Pagination page={page} pages={totalPages(total)} href={href} />
        </section>
      </ContentLayout>
    </div>
  );
}
