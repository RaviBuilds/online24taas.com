'use client';
import Link from './AppLink';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Icon } from './Icon';

export interface NavItem { label: string; href: string }

const safeDecode = (s: string) => {
  try { return decodeURIComponent(s); } catch { return s; }
};

/**
 * Sticky header bar: logo, desktop category nav, search and menu buttons; below 1280px a scrollable chip bar
 * carries the categories. The menu is a slide-over panel and search is a focused overlay.
 */
export function MainNav({ links, pages, logo, socialNode }: { links: NavItem[]; pages: NavItem[]; logo: ReactNode; socialNode: ReactNode }) {
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const pathname = usePathname();
  const input = useRef<HTMLInputElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const chips = useRef<HTMLUListElement>(null);

  const all: NavItem[] = [{ label: 'मुख्यपृष्ठ', href: '/' }, ...links];
  const current = safeDecode(pathname);
  const isCurrent = (href: string) => (href === '/' ? current === '/' : current === safeDecode(href) || current.startsWith(safeDecode(href) + '/'));

  // Close overlays after navigation.
  useEffect(() => {
    setMenu(false);
    setSearch(false);
  }, [pathname]);

  // Header condenses a little once the page has scrolled.
  useEffect(() => {
    const root = document.documentElement;
    const on = () => root.toggleAttribute('data-scrolled', window.scrollY > 16);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  // Escape closes, body scroll locks while an overlay is open, focus moves into the overlay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenu(false);
        setSearch(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    document.documentElement.toggleAttribute('data-lock', menu || search);
    if (search) input.current?.focus();
    else if (menu) closeBtn.current?.focus();
    return () => document.documentElement.removeAttribute('data-lock');
  }, [menu, search]);

  // Keep the active chip centred (scrolls the chip bar only, never the page).
  useEffect(() => {
    const bar = chips.current;
    const el = bar?.querySelector<HTMLElement>('[aria-current="page"]');
    if (bar && el) bar.scrollTo({ left: el.offsetLeft - bar.clientWidth / 2 + el.clientWidth / 2, behavior: 'auto' });
  }, [pathname]);

  const iconBtn = 'inline-flex size-11 items-center justify-center rounded-full text-ink transition-colors duration-150 hover:bg-saffron-soft';
  return (
    <>
      <header className="hdr sticky top-0 z-40 border-b border-line bg-surface">
        <div className="theme-wrapper flex h-[3.5rem] items-center gap-3 xl:h-[4.25rem]">
          {logo}
          <nav aria-label="मुख्य विभाग" className="ml-4 hidden min-w-0 flex-1 xl:block">
            <ul className="flex items-center">
              {all.map((l) => (
                <li key={l.href + l.label}>
                  <Link
                    href={l.href}
                    aria-current={isCurrent(l.href) ? 'page' : undefined}
                    className="relative inline-flex min-h-11 items-center px-3 text-[0.97rem] font-bold whitespace-nowrap transition-colors duration-150 hover:text-brand-dark aria-[current=page]:text-brand-dark after:absolute after:inset-x-3 after:bottom-1 after:h-[3px] after:origin-left after:scale-x-0 after:rounded-full after:bg-brand after:transition-transform after:duration-300 hover:after:scale-x-100 aria-[current=page]:after:scale-x-100"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <button type="button" className={iconBtn} aria-label="शोधा" aria-expanded={search} aria-controls="search-overlay" onClick={() => { setMenu(false); setSearch(true); }}>
              <Icon name="search" className="size-[22px]" />
            </button>
            <button type="button" className={`${iconBtn} bg-ink text-white hover:bg-brand`} aria-label="मेनू उघडा" aria-expanded={menu} aria-controls="menu-panel" onClick={() => { setSearch(false); setMenu(true); }}>
              <Icon name="menu" className="size-[22px]" />
            </button>
          </div>
        </div>

        {/* Mobile and tablet category chips */}
        <nav aria-label="विभाग" className="xl:hidden">
          <ul ref={chips} className="chips flex gap-2 overflow-x-auto px-[var(--gutter)] pb-2.5">
            {all.map((l) => (
              <li key={l.href + l.label} className="shrink-0">
                <Link
                  href={l.href}
                  aria-current={isCurrent(l.href) ? 'page' : undefined}
                  className="inline-flex min-h-11 items-center rounded-full border border-line bg-paper px-4 text-[0.95rem] font-semibold whitespace-nowrap transition-colors duration-150 aria-[current=page]:border-brand aria-[current=page]:bg-brand aria-[current=page]:text-white"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {/* Search overlay */}
      <div
        id="search-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="शोध"
        data-open={search}
        aria-hidden={!search}
        inert={!search}
        className="fade-panel fixed inset-0 z-50 h-dvh overflow-y-auto bg-paper px-[var(--gutter)] pt-[max(1rem,env(safe-area-inset-top))] pb-8 data-[open=false]:invisible data-[open=false]:-translate-y-2 data-[open=false]:opacity-0"
      >
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between">
            <p className="text-lg font-extrabold">शोधा</p>
            <button type="button" className={iconBtn} aria-label="बंद करा" onClick={() => setSearch(false)}><Icon name="close" className="size-6" /></button>
          </div>
          <form action="/search" role="search" className="mt-3 flex gap-2">
            <label htmlFor="site-search" className="sr-only">शोध शब्द</label>
            <input ref={input} id="site-search" name="q" type="search" enterKeyHint="search" autoComplete="off" required placeholder="बातम्या, विषय शोधा" className="min-h-14 min-w-0 flex-1 rounded-2xl border-2 border-line bg-surface px-4 text-lg focus:border-brand focus:outline-none" />
            <button type="submit" className="inline-flex min-h-14 items-center gap-2 rounded-2xl bg-brand px-5 font-bold text-white hover:bg-brand-dark"><Icon name="search" className="size-5" /><span className="max-sm:sr-only">शोधा</span></button>
          </form>
          <p className="mt-8 mb-3 text-sm font-bold text-muted">विभाग</p>
          <ul className="flex flex-wrap gap-2">
            {links.map((l) => (
              <li key={l.href}><Link href={l.href} className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 font-semibold hover:border-brand">{l.label}</Link></li>
            ))}
          </ul>
        </div>
      </div>

      {/* Menu slide-over */}
      <div
        aria-hidden
        data-open={menu}
        onClick={() => setMenu(false)}
        className="fade-panel fixed inset-0 z-50 bg-ink/50 data-[open=false]:invisible data-[open=false]:opacity-0"
      />
      <div
        id="menu-panel"
        role="dialog"
        aria-modal="true"
        aria-label="मेनू"
        data-open={menu}
        aria-hidden={!menu}
        inert={!menu}
        className="panel-slide fixed inset-y-0 right-0 z-50 flex h-dvh w-[min(22rem,92vw)] flex-col overflow-y-auto overscroll-contain bg-paper pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] shadow-2xl data-[open=false]:invisible data-[open=false]:translate-x-full"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <p className="text-lg font-extrabold">मेनू</p>
          <button ref={closeBtn} type="button" className={iconBtn} aria-label="मेनू बंद करा" onClick={() => setMenu(false)}><Icon name="close" className="size-6" /></button>
        </div>
        <nav aria-label="सर्व विभाग" className="px-3 py-3">
          <ul>
            {all.map((l) => (
              <li key={l.href + l.label}>
                <Link href={l.href} aria-current={isCurrent(l.href) ? 'page' : undefined} className="flex min-h-12 items-center justify-between rounded-xl px-3 text-[1.0625rem] font-bold hover:bg-saffron-soft aria-[current=page]:text-brand-dark">
                  {l.label}
                  <Icon name="chevronRight" className="size-4 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {pages.length > 0 && (
          <nav aria-label="महत्त्वाचे दुवे" className="border-t border-line px-3 py-3">
            <p className="px-3 pb-1 text-sm font-bold text-muted">महत्त्वाचे दुवे</p>
            <ul>
              {pages.map((l) => (
                <li key={l.href}><Link href={l.href} className="flex min-h-11 items-center rounded-xl px-3 hover:bg-saffron-soft">{l.label}</Link></li>
              ))}
              <li><a href="#contact" onClick={() => setMenu(false)} className="flex min-h-11 items-center rounded-xl px-3 hover:bg-saffron-soft">संपर्क</a></li>
            </ul>
          </nav>
        )}
        <div className="mt-auto border-t border-line px-5 pt-4">
          <p className="pb-2 text-sm font-bold text-muted">आम्हाला फॉलो करा</p>
          {socialNode}
        </div>
      </div>
    </>
  );
}
