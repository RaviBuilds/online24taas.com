import Link from './AppLink';
import { JsonLd } from './JsonLd';
import { Icon } from './Icon';
import { absoluteUrl } from '@/lib/site';

/** `name` feeds the structured data. `label` (display only) and `hidden` (not shown to readers) are visual overrides. */
export interface Crumb { name: string; href?: string; label?: string; hidden?: boolean }

export function Breadcrumbs({ items, className = '' }: { items: Crumb[]; className?: string }) {
  const all: Crumb[] = [{ name: 'मुख्यपृष्ठ', href: '/' }, ...items];
  const shown = all.filter((c) => !c.hidden);
  return (
    <>
      <nav aria-label="मार्ग" className={`text-[0.8125rem] text-muted ${className}`}>
        <ol className="flex flex-wrap items-center gap-x-1">
          {shown.map((c, i) => (
            <li key={i} className="flex min-w-0 items-center gap-1">
              {i > 0 && <Icon name="chevronRight" className="size-3.5 shrink-0 opacity-60" />}
              {c.href && i < shown.length - 1 ? (
                <Link href={c.href} className="inline-flex min-h-8 items-center hover:text-brand-dark">{c.label ?? c.name}</Link>
              ) : (
                <span aria-current={i === shown.length - 1 ? 'page' : undefined} className="line-clamp-1 [overflow-wrap:anywhere]">{c.label ?? c.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: all.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, ...(c.href ? { item: absoluteUrl(c.href) } : {}) })),
        }}
      />
    </>
  );
}
