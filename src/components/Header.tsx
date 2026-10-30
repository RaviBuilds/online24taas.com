import Link from 'next/link';
import { SITE_NAME } from '@/lib/site';
import { formatLongDate } from '@/lib/format';
import { categoryPath, pagePath } from '@/lib/urls';
import type { SiteData } from '@/lib/data';
import { MobileNav } from './MobileNav';
import { SanityImage } from './SanityImage';

export interface NavLink { label: string; href: string }

export function navLinks(site: SiteData): NavLink[] {
  const items = site.menu?.items ?? [];
  const links = items
    .map((i): NavLink | null => {
      const t = i.target;
      if (t?.slug) return { label: i.label || t.title || '', href: t._type === 'category' ? categoryPath(t.slug) : t._type === 'tag' ? `/tag/${encodeURIComponent(t.slug)}` : pagePath(t.slug) };
      if (i.url) return { label: i.label || '', href: i.url };
      return null;
    })
    .filter((l): l is NavLink => !!l && !!l.label);
  // Fallback if the editor has not built a menu yet: all categories.
  return links.length ? links : site.categories.map((c) => ({ label: c.title, href: categoryPath(c.slug) }));
}

export function Header({ site }: { site: SiteData }) {
  const links = navLinks(site);
  const social = site.settings?.socialLinks ?? [];
  return (
    <header className="border-b border-neutral-200">
      <div className="bg-topbar text-white">
        <div className="theme-wrapper flex items-center justify-between text-sm">
          <span className="bg-primary px-4 py-1.5 font-medium" suppressHydrationWarning>{formatLongDate()}</span>
          <ul className="flex items-center gap-3">
            {social.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="px-1 text-xs hover:text-neutral-300">{s.label}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="theme-wrapper flex items-center gap-4 py-4">
        <Link href="/" className="flex items-center gap-3" aria-label={SITE_NAME}>
          {site.settings?.logoRef && <SanityImage imageRef={site.settings.logoRef} alt="" sizes="64px" className="h-14 w-auto" priority />}
          <span className="block">
            <span className="block text-2xl font-bold leading-tight">{site.settings?.title || SITE_NAME}</span>
            {site.settings?.tagline && <span className="block text-sm text-neutral-600">{site.settings.tagline}</span>}
          </span>
        </Link>
      </div>
      <nav aria-label="मुख्य मेनू" className="relative border-t border-neutral-200">
        <div className="theme-wrapper flex items-center justify-between">
          <ul className="hidden flex-wrap md:flex">
            <li><Link href="/" className="block px-4 py-3 text-sm font-medium hover:text-primary">मुख्यपृष्ठ</Link></li>
            {links.map((l) => (
              <li key={l.href + l.label}><Link href={l.href} className="block px-4 py-3 text-sm font-medium hover:text-primary">{l.label}</Link></li>
            ))}
          </ul>
          <MobileNav links={[{ label: 'मुख्यपृष्ठ', href: '/' }, ...links]} />
          <form action="/search" role="search" className="ml-auto flex items-center py-2">
            <label htmlFor="site-search" className="sr-only">शोधा</label>
            <input id="site-search" name="q" type="search" placeholder="शोधा…" className="w-32 border border-neutral-300 px-3 py-1.5 text-sm sm:w-48" />
            <button type="submit" className="bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary-dark" aria-label="शोधा">🔍</button>
          </form>
        </div>
      </nav>
    </header>
  );
}

