import Link from './AppLink';
import { SITE_NAME } from '@/lib/site';
import { formatLongDate } from '@/lib/format';
import { categoryPath, pagePath } from '@/lib/urls';
import type { SiteData } from '@/lib/data';
import { MainNav, type NavItem } from './MainNav';
import { SanityImage } from './SanityImage';

export type NavLink = NavItem;

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

/** Adore News header: dark top bar (date + social), patterned brand band, then the navigation bar. */
export function Header({ site }: { site: SiteData }) {
  const links = navLinks(site);
  const social = site.settings?.socialLinks ?? [];
  const name = site.settings?.title || SITE_NAME;
  return (
    <header className="site-header">
      <div className="bg-topbar py-2.5 text-white">
        <div className="theme-wrapper flex items-center justify-between gap-3">
          <p className="-my-2.5 bg-primary px-3 py-2.5 text-[0.75rem] leading-snug font-bold tracking-[0.5px] sm:px-5 sm:text-[0.85rem]" suppressHydrationWarning>{formatLongDate()}</p>
          <ul className="flex flex-wrap items-center justify-end gap-x-3 text-[0.75rem] sm:text-[0.8rem]" aria-label="सोशल लिंक">
            {social.map((s) => (
              <li key={s.url + s.label}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="block py-1 hover:text-primary">{s.label}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="header-band">
        <div className="theme-wrapper flex justify-center py-1">
          <Link href="/" className="flex items-center gap-3" aria-label={`${name} - मुख्यपृष्ठ`}>
            {site.settings?.logoRef ? (
              <SanityImage imageRef={site.settings.logoRef} alt="" sizes="144px" className="size-24 object-contain sm:size-36" priority />
            ) : null}
            <span className="sr-only">{name}</span>
          </Link>
        </div>
      </div>
      <MainNav links={links} />
    </header>
  );
}
