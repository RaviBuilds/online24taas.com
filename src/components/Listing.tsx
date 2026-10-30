import { notFound } from 'next/navigation';
import { PostCard } from './PostCard';
import { Pagination } from './Pagination';
import { Sidebar } from './Sidebar';
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

/** Shared archive layout: breadcrumb, heading, list, pagination, sidebar. 404s for out-of-range pages. */
export function Listing({ heading, intro, crumbs, posts, total, page, href, empty = 'कोणतीही बातमी आढळली नाही.' }: Props) {
  if (page > 1 && posts.length === 0) notFound();
  return (
    <div className="theme-wrapper py-6">
      <Breadcrumbs items={crumbs} />
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <section>
          <h1 className="mb-1 text-2xl font-bold md:text-3xl">{heading}</h1>
          {intro && <p className="mb-2 text-neutral-700">{intro}</p>}
          <p className="mb-2 text-sm text-neutral-600">{total} लेख{page > 1 ? ` · पृष्ठ ${page}` : ''}</p>
          {posts.length === 0 ? <p className="py-8">{empty}</p> : posts.map((p, i) => <PostCard key={p._id} post={p} priority={i < 2} />)}
          <Pagination page={page} pages={totalPages(total)} href={href} />
        </section>
        <Sidebar />
      </div>
    </div>
  );
}
