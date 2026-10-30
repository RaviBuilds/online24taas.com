import Link from 'next/link';
import { sanityFetch } from '@/sanity/lib/client';
import { LATEST_QUERY } from '@/sanity/lib/queries';
import { getSite, type PostCardData } from '@/lib/data';
import { categoryPath } from '@/lib/urls';
import { MiniCard } from './PostCard';

export async function Sidebar() {
  const [latest, site] = await Promise.all([
    sanityFetch<PostCardData[]>(LATEST_QUERY, { from: 0, to: 6 }, ['posts']),
    getSite(),
  ]);
  return (
    <aside className="space-y-8" aria-label="साइडबार">
      <section>
        <h2 className="mb-2 bg-primary px-4 py-2 font-semibold text-white">ताज्या बातम्या</h2>
        {latest.map((p) => <MiniCard key={p._id} post={p} />)}
      </section>
      <section>
        <h2 className="section-title">विभाग</h2>
        <ul className="space-y-1 text-sm">
          {site.categories.filter((c) => c.count > 0).map((c) => (
            <li key={c.slug} className="flex justify-between border-b border-neutral-100 py-1">
              <Link href={categoryPath(c.slug)} className="hover:text-primary">{c.title}</Link>
              <span className="text-neutral-500">{c.count}</span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
