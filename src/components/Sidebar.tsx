import { sanityFetch } from '@/sanity/lib/client';
import { LATEST_QUERY } from '@/sanity/lib/queries';
import type { PostCardData } from '@/lib/data';
import { MiniCard } from './PostCard';

/** Right-hand widget area. The original (Adore News sidebar-1) held one widget: heading + latest posts. */
export async function Sidebar() {
  const latest = await sanityFetch<PostCardData[]>(LATEST_QUERY, { from: 0, to: 8 }, ['posts']);
  return (
    <aside id="secondary" aria-label="साइडबार" className="min-w-0 lg:sticky lg:top-10 lg:self-start">
      <section>
        <h2 className="section-title">ताज्या बातम्या</h2>
        <div>{latest.map((p) => <MiniCard key={p._id} post={p} />)}</div>
      </section>
    </aside>
  );
}
