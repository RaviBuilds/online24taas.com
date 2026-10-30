import Link from 'next/link';
import type { PostCardData } from '@/lib/data';
import { categoryPath, postPath } from '@/lib/urls';
import { formatDate } from '@/lib/format';
import { SanityImage } from './SanityImage';

/** Horizontal list card (listings, archives, search). */
export function PostCard({ post, priority }: { post: PostCardData; priority?: boolean }) {
  const cat = post.categories?.[0];
  return (
    <article className="grid gap-4 border-b border-neutral-200 py-5 sm:grid-cols-[260px_1fr]">
      <Link href={postPath(post.slug)} className="relative block aspect-[16/10] overflow-hidden bg-neutral-100" aria-hidden tabIndex={-1}>
        {post.image?.ref && <SanityImage fill imageRef={post.image.ref} alt="" sizes="(min-width: 640px) 260px, 100vw" priority={priority} className="object-cover" />}
      </Link>
      <div>
        {cat && <Link href={categoryPath(cat.slug)} className="mb-1 inline-block bg-primary px-2 py-0.5 text-xs font-medium text-white">{cat.title}</Link>}
        <h2 className="text-xl leading-snug font-bold"><Link href={postPath(post.slug)} className="hover:text-primary">{post.title}</Link></h2>
        <p className="mt-1 text-sm text-neutral-600"><time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>{post.authorName ? ` · ${post.authorName}` : ''}</p>
        {post.excerpt && <p className="mt-2 line-clamp-3 text-neutral-700">{post.excerpt}</p>}
      </div>
    </article>
  );
}

/** Image-overlay tile used by the home banner. */
export function OverlayTile({ post, large, priority }: { post: PostCardData; large?: boolean; priority?: boolean }) {
  const cat = post.categories?.[0];
  return (
    <article className={`group relative isolate overflow-hidden bg-neutral-800 ${large ? 'min-h-[320px] md:row-span-2 md:min-h-[480px]' : 'min-h-[200px]'}`}>
      {post.image?.ref && <SanityImage fill imageRef={post.image.ref} alt="" sizes={large ? '(min-width: 768px) 50vw, 100vw' : '(min-width: 768px) 25vw, 100vw'} priority={priority} className="-z-10 object-cover transition-transform duration-300 group-hover:scale-105" />}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="flex h-full min-h-[inherit] flex-col justify-end p-4 text-white">
        {cat && <Link href={categoryPath(cat.slug)} className="mb-2 w-fit border border-white/70 px-2 text-xs">{cat.title}</Link>}
        <h2 className={`${large ? 'text-2xl md:text-3xl' : 'text-base md:text-lg'} leading-snug font-bold`}>
          <Link href={postPath(post.slug)} className="after:absolute after:inset-0">{post.title}</Link>
        </h2>
        <p className="mt-1 text-xs"><time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time></p>
      </div>
    </article>
  );
}

/** Compact thumbnail row for sidebars and related posts. */
export function MiniCard({ post }: { post: PostCardData }) {
  return (
    <article className="flex gap-3 border-b border-neutral-100 py-3">
      <Link href={postPath(post.slug)} className="relative block size-16 shrink-0 overflow-hidden bg-neutral-100" aria-hidden tabIndex={-1}>
        {post.image?.ref && <SanityImage fill imageRef={post.image.ref} alt="" sizes="64px" className="object-cover" />}
      </Link>
      <div className="min-w-0">
        <h3 className="text-sm leading-snug font-semibold"><Link href={postPath(post.slug)} className="hover:text-primary">{post.title}</Link></h3>
        <p className="mt-0.5 text-xs text-neutral-600">{formatDate(post.publishedAt)}</p>
      </div>
    </article>
  );
}
