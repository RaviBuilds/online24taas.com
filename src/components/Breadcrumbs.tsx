import Link from './AppLink';
import { JsonLd } from './JsonLd';
import { absoluteUrl } from '@/lib/site';

export interface Crumb { name: string; href?: string }

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all: Crumb[] = [{ name: 'मुख्यपृष्ठ', href: '/' }, ...items];
  return (
    <>
      <nav aria-label="Breadcrumb" className="mt-3 mb-1 text-[0.85rem] text-neutral-600">
        <ol className="flex flex-wrap items-center gap-x-1.5">
          {all.map((c, i) => (
            <li key={i} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && <span aria-hidden>/</span>}
              {c.href && i < all.length - 1 ? <Link href={c.href} className="hover:text-primary">{c.name}</Link> : <span aria-current={i === all.length - 1 ? 'page' : undefined} className="[overflow-wrap:anywhere]">{c.name}</span>}
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
