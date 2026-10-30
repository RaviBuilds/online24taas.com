import Link from 'next/link';

export function Pagination({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  const window = new Set<number>([1, pages, page - 1, page, page + 1]);
  const nums = [...window].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  return (
    <nav aria-label="पृष्ठे" className="my-8 flex flex-wrap items-center justify-center gap-2 text-sm">
      {page > 1 && <Link prefetch={false} rel="prev" href={href(page - 1)} className="border border-neutral-300 px-3 py-1.5 hover:border-primary hover:text-primary">‹ मागील</Link>}
      {nums.map((n, i) => (
        <span key={n} className="flex items-center gap-2">
          {i > 0 && n - nums[i - 1] > 1 && <span aria-hidden>…</span>}
          {n === page ? (
            <span aria-current="page" className="bg-primary px-3 py-1.5 font-semibold text-white">{n}</span>
          ) : (
            <Link prefetch={false} href={href(n)} className="border border-neutral-300 px-3 py-1.5 hover:border-primary hover:text-primary">{n}</Link>
          )}
        </span>
      ))}
      {page < pages && <Link prefetch={false} rel="next" href={href(page + 1)} className="border border-neutral-300 px-3 py-1.5 hover:border-primary hover:text-primary">पुढील ›</Link>}
    </nav>
  );
}
