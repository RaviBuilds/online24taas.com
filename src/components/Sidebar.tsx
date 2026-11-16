import Link from './AppLink';
import { sanityFetch } from '@/sanity/lib/client';
import { LATEST_QUERY } from '@/sanity/lib/queries';
import { getSite, type PostCardData } from '@/lib/data';
import { categoryPath } from '@/lib/urls';
import { formatNumber, isPlaceholderCategory, toneFor } from '@/lib/present';
import { CompactCard } from './PostCard';
import { SectionHeader } from './SectionHeader';
import { SocialLinks } from './SocialLinks';

/** Desktop sidebar: recent stories (thumbnail + title), real categories and the follow-us block. */
export async function Sidebar({ posts, title = 'ताज्या बातम्या' }: { posts?: PostCardData[]; title?: string }) {
  const [site, fetched] = await Promise.all([getSite(), posts ? Promise.resolve(posts) : sanityFetch<PostCardData[]>(LATEST_QUERY, { from: 0, to: 6 }, ['posts'])]);
  const list = fetched.slice(0, 6);
  const cats = site.categories.filter((c) => !isPlaceholderCategory(c) && c.count > 0).sort((a, b) => b.count - a.count).slice(0, 10);
  const social = site.settings?.socialLinks ?? [];
  return (
    <aside id="secondary" aria-label="बाजूचा स्तंभ" className="min-w-0 space-y-9 lg:sticky lg:top-[calc(var(--header-h)+1.25rem)] lg:max-h-[calc(100svh-var(--header-h)-2rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
      {list.length > 0 && (
        <section aria-labelledby="sb-latest">
          <SectionHeader id="sb-latest" title={title} />
          <div className="divide-y divide-line">{list.map((p) => <CompactCard key={p._id} post={p} thumb={!!p.image?.ref} />)}</div>
        </section>
      )}
      {cats.length > 0 && (
        <section aria-labelledby="sb-cats" className="max-lg:hidden">
          <SectionHeader id="sb-cats" title="विभाग" tone="saffron" />
          <ul className="divide-y divide-line rounded-[var(--radius-img)] border border-line bg-surface">
            {cats.map((c) => (
              <li key={c.slug}>
                <Link href={categoryPath(c.slug)} data-tone={toneFor(c.slug)} className="flex min-h-12 items-center gap-3 px-4 py-2 font-semibold hover:text-brand-dark">
                  <span aria-hidden className="size-2 rounded-full bg-[var(--tone)]" />
                  <span className="flex-1">{c.title}</span>
                  <span className="text-sm font-medium text-muted">{formatNumber(c.count)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {social.length > 0 && (
        <section aria-labelledby="sb-follow">
          <SectionHeader id="sb-follow" title="आम्हाला फॉलो करा" tone="indigo" />
          <SocialLinks links={social} variant="light" />
        </section>
      )}
    </aside>
  );
}
