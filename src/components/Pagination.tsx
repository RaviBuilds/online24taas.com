import Link from './AppLink';
import { Icon } from './Icon';
import { formatNumber } from '@/lib/present';

const pill = 'inline-flex min-h-12 min-w-12 items-center justify-center rounded-full px-3 text-[0.95rem] font-bold transition-colors duration-150';

/** Crawlable pager: prev/next pills, "पृष्ठ १ / ६६" in Marathi numerals, and a number window from 640px up. */
export function Pagination({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  const set = new Set<number>([1, pages, page - 1, page, page + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  return (
    <nav aria-label="पृष्ठे" className="mt-10 mb-4">
      <div className="flex items-center justify-between gap-2 sm:justify-center sm:gap-2">
        {page > 1 ? (
          <Link prefetch={false} rel="prev" href={href(page - 1)} className={`${pill} gap-1.5 bg-ink pr-5 text-white hover:bg-brand`}>
            <Icon name="arrowLeft" className="size-4" /> मागील
          </Link>
        ) : (
          <span aria-hidden className={`${pill} invisible sm:hidden`}>मागील</span>
        )}

        <p className="text-[0.95rem] font-semibold text-muted sm:hidden" aria-current="page">
          पृष्ठ {formatNumber(page)} / {formatNumber(pages)}
        </p>

        <ul className="hidden items-center gap-1.5 sm:flex">
          {nums.map((n, i) => (
            <li key={n} className="flex items-center gap-1.5">
              {i > 0 && n - nums[i - 1] > 1 && <span aria-hidden className="px-1 text-muted">…</span>}
              {n === page ? (
                <span aria-current="page" aria-label={`पृष्ठ ${formatNumber(n)}, सध्याचे`} className={`${pill} bg-brand text-white`}>{formatNumber(n)}</span>
              ) : (
                <Link prefetch={false} href={href(n)} aria-label={`पृष्ठ ${formatNumber(n)}`} className={`${pill} border border-line bg-surface hover:border-brand hover:text-brand-dark`}>{formatNumber(n)}</Link>
              )}
            </li>
          ))}
        </ul>

        {page < pages ? (
          <Link prefetch={false} rel="next" href={href(page + 1)} className={`${pill} gap-1.5 bg-ink pl-5 text-white hover:bg-brand`}>
            पुढील <Icon name="arrowRight" className="size-4" />
          </Link>
        ) : (
          <span aria-hidden className={`${pill} invisible sm:hidden`}>पुढील</span>
        )}
      </div>
      <p className="mt-3 hidden text-center text-sm text-muted sm:block">पृष्ठ {formatNumber(page)} / {formatNumber(pages)}</p>
    </nav>
  );
}
