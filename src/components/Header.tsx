import Link from './AppLink';
import { SITE_NAME } from '@/lib/site';
import { formatLongDate } from '@/lib/format';
import { categoryPath, pagePath } from '@/lib/urls';
import type { SiteData } from '@/lib/data';
import { FOOTER_PAGE_SLUGS } from '@/lib/footer';
import { pageLabel } from '@/lib/labels';
import { MainNav, type NavItem } from './MainNav';
import { SanityImage } from './SanityImage';
import { SocialLinks } from './SocialLinks';

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

/**
 * The logo file is a square canvas with generous white margins. It is cropped to the artwork with plain CSS
 * percentages (no redraw), and multiplied onto the page so its white background disappears.
 */
function Logo({ imageRef, name }: { imageRef?: string; name: string }) {
  return (
    <Link href="/" aria-label={`${name} - मुख्यपृष्ठ`} className="hdr-logo relative block h-12 w-[82px] shrink-0 overflow-hidden xl:h-14 xl:w-[96px]">
      {imageRef ? (
        <SanityImage imageRef={imageRef} alt="" sizes="120px" priority className="absolute top-[-36%] left-[-8.1%] block h-auto w-[116.3%] max-w-none mix-blend-multiply" />
      ) : (
        <span className="text-lg font-extrabold">{name}</span>
      )}
    </Link>
  );
}

/** Slim utility line (desktop only, scrolls away), then the sticky header with category navigation. */
export function Header({ site }: { site: SiteData }) {
  const links = navLinks(site);
  const social = site.settings?.socialLinks ?? [];
  const name = site.settings?.title || SITE_NAME;
  const pages = FOOTER_PAGE_SLUGS.map((slug) => site.pages.find((p) => p.slug === slug))
    .filter((p): p is { title: string; slug: string } => !!p)
    .map((p) => ({ label: pageLabel(p.slug, p.title), href: pagePath(p.slug) }));
  return (
    <>
      <div className="on-dark hidden bg-ink text-white lg:block">
        <div className="theme-wrapper flex min-h-10 items-center justify-between gap-4">
          <p className="text-[0.8125rem] font-medium text-white/80">{formatLongDate()}</p>
          {social.length > 0 && (
            <ul className="flex items-center gap-1" aria-label="सोशल मीडिया">
              {social.map((s) => (
                <li key={s.url + s.label}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center px-2.5 text-[0.8125rem] font-medium text-white/80 transition-colors hover:text-saffron">{s.label}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <MainNav
        links={links}
        pages={pages}
        logo={<Logo imageRef={site.settings?.logoRef} name={name} />}
        socialNode={<SocialLinks links={social} variant="light" showLabels />}
      />
    </>
  );
}
