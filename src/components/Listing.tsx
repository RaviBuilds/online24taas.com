import { notFound } from 'next/navigation';
import { PostCard } from './PostCard';
import { Pagination } from './Pagination';
import { ContentLayout, CardGrid } from './ContentLayout';
import { Breadcrumbs, type Crumb } from './Breadcrumbs';
import type { PostCardData } from '@/lib/data';
import { totalPages } from '@/lib/data';

interface Props {
  heading: string;
  intro?: string | null;
  crumbs: Crumb[];
  posts: PostCardData[];
  total: number;
  page: number;
  href: (p: number) => string;
  empty?: string;
}

/** Shared archive layout: page header + breadcrumb, 3-column card grid, pagination, sidebar. 404s for out-of-range pages. */
export function Listing({ heading, intro, crumbs, posts, total, page, href, empty = 'कोणतीही बातमी आढळली नाही.' }: Props) {
  if (page > 1 && posts.length === 0) notFound();
  return (
    <div className="theme-wrapper mt-[30px]">
      <ContentLayout>
        <section data-listing>
          <header className="mb-5">
            <h1 className="text-[length:var(--text-lead)] leading-[1.4] font-bold [overflow-wrap:anywhere]">{heading}</h1>
            {intro && <p className="mt-1 text-neutral-700">{intro}</p>}
            <p className="mt-1 text-[0.85rem] text-neutral-600">{total} लेख{page > 1 ? ` · पृष्ठ ${page}` : ''}</p>
            <Breadcrumbs items={crumbs} />
          </header>
          {posts.length === 0 ? <p className="py-8">{empty}</p> : <CardGrid>{posts.map((p, i) => <PostCard key={p._id} post={p} priority={i < 3} />)}</CardGrid>}
          <Pagination page={page} pages={totalPages(total)} href={href} />
        </section>
      </ContentLayout>
    </div>
  );
}
