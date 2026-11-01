import Link from './AppLink';

const box = 'flex h-9 min-w-9 items-center justify-center border border-ink px-2 transition-colors';

/** Numbered pager with square bordered boxes (Adore News "nav-links"). */
export function Pagination({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  const window = new Set<number>([1, pages, page - 1, page, page + 1]);
  const nums = [...window].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  return (
    <nav aria-label="पृष्ठे" className="mt-10 mb-5 flex flex-wrap items-center justify-center gap-[5px]">
      {page > 1 && <Link prefetch={false} rel="prev" href={href(page - 1)} className={`${box} hover:border-primary hover:text-primary`}>‹ मागील</Link>}
      {nums.map((n, i) => (
        <span key={n} className="flex items-center gap-[5px]">
          {i > 0 && n - nums[i - 1] > 1 && <span aria-hidden>…</span>}
          {n === page ? (
            <span aria-current="page" className={`${box} border-primary bg-primary font-semibold text-white`}>{n}</span>
          ) : (
            <Link prefetch={false} href={href(n)} className={`${box} hover:border-primary hover:text-primary`}>{n}</Link>
          )}
        </span>
      ))}
      {page < pages && <Link prefetch={false} rel="next" href={href(page + 1)} className={`${box} hover:border-primary hover:text-primary`}>पुढील ›</Link>}
    </nav>
  );
}
