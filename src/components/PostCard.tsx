import Link from './AppLink';
import type { PostCardData } from '@/lib/data';
import { postPath } from '@/lib/urls';
import { formatDate } from '@/lib/format';
import { primaryCategory, toneFor } from '@/lib/present';
import { CoverImage } from './CoverImage';

/** Small coloured-dot category label. Renders nothing for posts with only the placeholder "All" category. */
export function CategoryLabel({ post, onImage }: { post: Pick<PostCardData, 'categories'>; onImage?: boolean }) {
  const c = primaryCategory(post.categories);
  if (!c) return null;
  return (
    <span data-tone={toneFor(c.slug)} className={`label-dot ${onImage ? 'on-img' : ''}`}>
      {c.title}
    </span>
  );
}

function When({ post, className = '' }: { post: PostCardData; className?: string }) {
  return (
    <time dateTime={post.publishedAt} className={`text-[0.8125rem] leading-6 ${className}`}>
      {formatDate(post.publishedAt)}
    </time>
  );
}

const stretch = 'after:absolute after:inset-0 after:z-10';

/** LEAD: the one story that matters most. Full-bleed image, gradient scrim, large headline. */
export function LeadCard({ post, priority, className = '' }: { post: PostCardData; priority?: boolean; className?: string }) {
  return (
    <article className={`group relative isolate overflow-hidden rounded-[var(--radius-img)] bg-ink press ${className}`}>
      <div className="zoom absolute inset-0 -z-10">
        <CoverImage imageRef={post.image?.ref} ratio={1.4} sizes="(min-width: 1024px) 700px, 100vw" priority={priority} />
      </div>
      <div className="scrim absolute inset-0 -z-10" />
      <div className="flex h-full min-h-[22rem] flex-col justify-end gap-2 p-4 pt-24 text-white sm:p-6 md:min-h-[30rem]">
        <CategoryLabel post={post} onImage />
        <h2 className="hl line-clamp-4 text-[1.5rem] sm:text-[1.85rem] lg:text-[2.1rem]">
          <Link href={postPath(post.slug)} className={`u-link ${stretch}`}>{post.title}</Link>
        </h2>
        <When post={post} className="text-white/80" />
      </div>
    </article>
  );
}

/** SECONDARY: smaller overlay card that sits beside or below the lead. */
export function SecondaryCard({ post, priority, className = '' }: { post: PostCardData; priority?: boolean; className?: string }) {
  return (
    <article className={`group relative isolate overflow-hidden rounded-[var(--radius-img)] bg-ink press ${className}`}>
      <div className="zoom absolute inset-0 -z-10">
        <CoverImage imageRef={post.image?.ref} ratio={1.5} sizes="(min-width: 1024px) 380px, 80vw" priority={priority} />
      </div>
      <div className="scrim absolute inset-0 -z-10" />
      <div className="flex h-full min-h-[11.5rem] flex-col justify-end gap-1.5 p-3.5 pt-16 text-white">
        <CategoryLabel post={post} onImage />
        <h3 className="hl line-clamp-3 text-[1.0625rem] sm:text-[1.125rem]">
          <Link href={postPath(post.slug)} className={`u-link ${stretch}`}>{post.title}</Link>
        </h3>
        <When post={post} className="text-white/75" />
      </div>
    </article>
  );
}

/** STANDARD: image on top, then label, headline, date and an optional excerpt. */
export function StandardCard({ post, priority, excerpt = true, className = '' }: { post: PostCardData; priority?: boolean; excerpt?: boolean; className?: string }) {
  return (
    <article className={`group relative min-w-0 press ${className}`}>
      <div className="zoom relative aspect-[16/10] overflow-hidden rounded-[var(--radius-img)] bg-ink-2">
        <CoverImage imageRef={post.image?.ref} ratio={1.6} sizes="(min-width: 1024px) 400px, (min-width: 640px) 45vw, 100vw" priority={priority} />
      </div>
      <div className="flex flex-col gap-1 pt-3">
        <CategoryLabel post={post} />
        <h3 className="hl line-clamp-3 text-[1.1875rem]">
          <Link href={postPath(post.slug)} className={`u-link ${stretch}`}>{post.title}</Link>
        </h3>
        {excerpt && post.excerpt && <p className="line-clamp-2 text-[0.9375rem] leading-[1.7] text-muted">{post.excerpt}</p>}
        <When post={post} className="text-muted" />
      </div>
    </article>
  );
}

/** COMPACT: small thumbnail beside the headline. The dense row for mobile lists and sidebars. */
export function CompactCard({ post, thumb = true, className = '' }: { post: PostCardData; thumb?: boolean; className?: string }) {
  return (
    <article className={`group relative flex min-w-0 gap-3 py-3 press ${className}`}>
      {thumb && (
        <div className="zoom relative size-[5.5rem] shrink-0 overflow-hidden rounded-xl bg-ink-2 sm:size-24">
          <CoverImage imageRef={post.image?.ref} ratio={1} sizes="96px" />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <CategoryLabel post={post} />
        <h3 className="hl line-clamp-3 text-[1rem] font-bold">
          <Link href={postPath(post.slug)} className={`u-link ${stretch}`}>{post.title}</Link>
        </h3>
        <When post={post} className="text-muted" />
      </div>
    </article>
  );
}

/** TEXT-ONLY: headline and meta, for long lists and posts without a usable image. */
export function TextCard({ post, className = '' }: { post: PostCardData; className?: string }) {
  return (
    <article className={`group relative flex min-w-0 flex-col gap-0.5 py-3 press ${className}`}>
      <CategoryLabel post={post} />
      <h3 className="hl line-clamp-3 text-[1.0625rem] font-bold">
        <Link href={postPath(post.slug)} className={`u-link ${stretch}`}>{post.title}</Link>
      </h3>
      <When post={post} className="text-muted" />
    </article>
  );
}

/** Archive card: compact row on phones (many stories per screen), image-on-top card from 640px up. */
export function ListCard({ post, priority, className = '' }: { post: PostCardData; priority?: boolean; className?: string }) {
  return (
    <article className={`group relative flex min-w-0 gap-3 border-b border-line py-3 press last:border-0 sm:block sm:border-0 sm:py-0 ${className}`}>
      <div className="zoom relative size-[5.5rem] shrink-0 overflow-hidden rounded-xl bg-ink-2 sm:aspect-[16/10] sm:size-auto sm:rounded-[var(--radius-img)]">
        <CoverImage imageRef={post.image?.ref} ratio={1.3} sizes="(min-width: 1024px) 400px, (min-width: 640px) 45vw, 96px" priority={priority} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 sm:justify-start sm:gap-1 sm:pt-3">
        <CategoryLabel post={post} />
        <h3 className="hl line-clamp-3 text-[1rem] sm:text-[1.1875rem]">
          <Link href={postPath(post.slug)} className={`u-link ${stretch}`}>{post.title}</Link>
        </h3>
        {post.excerpt && <p className="line-clamp-2 text-[0.9375rem] leading-[1.7] text-muted max-sm:hidden">{post.excerpt}</p>}
        <When post={post} className="text-muted" />
      </div>
    </article>
  );
}

/** Dispatch used by long lists: posts with a real image get a thumbnail row, others fall back to text. */
export function FeedItem({ post }: { post: PostCardData }) {
  return post.image?.ref ? <CompactCard post={post} /> : <TextCard post={post} />;
}
