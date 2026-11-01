import Link from './AppLink';
import type { PostCardData } from '@/lib/data';
import { categoryPath, postPath } from '@/lib/urls';
import { formatDate } from '@/lib/format';
import { SanityImage } from './SanityImage';

function CategoryChips({ post }: { post: PostCardData }) {
  if (!post.categories?.length) return null;
  return (
    <ul className="flex flex-wrap gap-[5px]" aria-label="विभाग">
      {post.categories.map((c) => (
        <li key={c.slug}>
          <Link href={categoryPath(c.slug)} className="block rounded-[3px] bg-primary px-[7px] py-[3px] text-[0.75rem] leading-[1.4] text-white hover:opacity-80">{c.title}</Link>
        </li>
      ))}
    </ul>
  );
}

function Meta({ post, light }: { post: PostCardData; light?: boolean }) {
  return (
    <p className={`flex flex-wrap items-center text-[0.8rem] font-medium ${light ? 'text-white' : ''}`}>
      {post.authorName && (
        <>
          <span>{post.authorName}</span>
          <span aria-hidden className={`mx-1.5 inline-block size-[3px] ${light ? 'bg-white' : 'bg-ink'}`} />
        </>
      )}
      <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
    </p>
  );
}

/** Grid card (Adore News "post-item post-grid"): thumbnail, category chips, headline, meta, excerpt. */
export function PostCard({ post, priority }: { post: PostCardData; priority?: boolean }) {
  return (
    <article className="post-item min-w-0">
      <Link href={postPath(post.slug)} className="post-item-image relative block aspect-[10/7] overflow-hidden bg-neutral-100" aria-hidden tabIndex={-1}>
        {post.image?.ref && <SanityImage fill imageRef={post.image.ref} alt="" sizes="(min-width: 1024px) 300px, (min-width: 600px) 45vw, 100vw" priority={priority} className="object-cover" />}
      </Link>
      <div className="pt-[15px]">
        <CategoryChips post={post} />
        <h2 className="my-2.5 text-[length:var(--text-card)] leading-[1.45] font-bold [overflow-wrap:anywhere]">
          <Link href={postPath(post.slug)} className="entry-title-link">{post.title}</Link>
        </h2>
        <div className="mb-2.5"><Meta post={post} /></div>
        {post.excerpt && <p className="line-clamp-3 text-[0.95rem] leading-[1.7] text-neutral-700">{post.excerpt}</p>}
      </div>
    </article>
  );
}

/** Banner tile (Adore News "overlay-post slider-item"): full-bleed image, gradient, text bottom-left. */
export function OverlayTile({ post, large, priority, className = '' }: { post: PostCardData; large?: boolean; priority?: boolean; className?: string }) {
  return (
    <article
      className={`post-item group relative isolate min-h-[220px] overflow-hidden bg-neutral-800 ${large ? 'min-h-[280px] md:min-h-[360px] lg:min-h-[440px]' : ''} ${className}`}
    >
      {post.image?.ref && (
        <SanityImage
          fill
          imageRef={post.image.ref}
          alt=""
          sizes={large ? '(min-width: 1024px) 640px, 100vw' : '(min-width: 1024px) 320px, (min-width: 768px) 50vw, 100vw'}
          priority={priority}
          fetchPriority={large && priority ? 'high' : undefined}
          className="-z-10 object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        <CategoryChips post={post} />
        <h2 className={`my-2 leading-[1.45] font-bold [overflow-wrap:anywhere] ${large ? 'text-[length:var(--text-lead)]' : 'text-[length:var(--text-card)]'}`}>
          <Link href={postPath(post.slug)} className="after:absolute after:inset-0 after:z-10 hover:underline focus-visible:outline-white">{post.title}</Link>
        </h2>
        <Meta post={post} light />
      </div>
    </article>
  );
}

/** Plain headline row for sidebars ("Latest Post" widget in the original lists titles only). */
export function MiniCard({ post, thumb }: { post: PostCardData; thumb?: boolean }) {
  return (
    <article className="flex gap-3 border-b border-black/10 py-2.5 last:border-0">
      {thumb && (
        <Link href={postPath(post.slug)} className="relative block size-16 shrink-0 overflow-hidden bg-neutral-100" aria-hidden tabIndex={-1}>
          {post.image?.ref && <SanityImage fill imageRef={post.image.ref} alt="" sizes="64px" className="object-cover" />}
        </Link>
      )}
      <div className="min-w-0">
        <h3 className="text-[0.95rem] leading-[1.5] font-semibold [overflow-wrap:anywhere]"><Link href={postPath(post.slug)} className="hover:text-primary">{post.title}</Link></h3>
        <p className="mt-0.5 text-[0.8rem] text-neutral-600">{formatDate(post.publishedAt)}</p>
      </div>
    </article>
  );
}
