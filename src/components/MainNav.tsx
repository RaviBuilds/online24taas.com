'use client';
import Link from './AppLink';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export interface NavItem { label: string; href: string }

/**
 * Primary navigation bar (Adore News "header-nav-search"): category links on the left, search icon on the
 * right that reveals the search form. Below 992px the links collapse behind a three-bar toggle.
 */
export function MainNav({ links }: { links: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const searchInput = useRef<HTMLInputElement>(null);

  // Close menus after navigation and on Escape.
  useEffect(() => {
    setOpen(false);
    setSearchOpen(false);
  }, [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);

  const all: NavItem[] = [{ label: 'मुख्यपृष्ठ', href: '/' }, ...links];
  const isCurrent = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/'));
  return (
    <nav aria-label="मुख्य मेनू" className="relative border-b border-black/15 bg-white shadow-[0_0_4px_0_rgba(10,10,10,0.06)]">
      <div className="theme-wrapper flex items-center justify-between py-2.5">
        <button
          type="button"
          className="menu-toggle flex size-11 flex-col items-center justify-center gap-[5px] lg:hidden"
          aria-expanded={open}
          aria-controls="primary-menu"
          aria-label={open ? 'मेनू बंद करा' : 'मेनू उघडा'}
          onClick={() => setOpen((o) => !o)}
        >
          <span className={`h-0.5 w-6 bg-ink transition-transform ${open ? 'translate-y-[7px] rotate-45' : ''}`} />
          <span className={`h-0.5 w-6 bg-ink transition-opacity ${open ? 'opacity-0' : ''}`} />
          <span className={`h-0.5 w-6 bg-ink transition-transform ${open ? '-translate-y-[7px] -rotate-45' : ''}`} />
        </button>
        <ul
          id="primary-menu"
          className={`${open ? 'flex' : 'hidden'} absolute inset-x-0 top-full z-40 flex-col border-b border-black/15 bg-white shadow-lg lg:static lg:z-auto lg:flex lg:flex-row lg:flex-wrap lg:border-0 lg:shadow-none`}
        >
          {all.map((l) => (
            <li key={l.href + l.label} className="border-t border-black/10 first:border-t-0 lg:border-0">
              <Link
                href={l.href}
                aria-current={isCurrent(l.href) ? 'page' : undefined}
                className="nav-link block px-[15px] py-3 font-bold hover:text-primary aria-[current=page]:text-primary lg:py-[15px]"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="relative ml-auto">
          <button
            type="button"
            className="flex size-11 items-center justify-center hover:text-primary"
            aria-expanded={searchOpen}
            aria-controls="nav-search"
            aria-label="शोधा"
            onClick={() => setSearchOpen((o) => !o)}
          >
            <svg aria-hidden viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m20 20-4.9-4.9" />
            </svg>
          </button>
          <form
            id="nav-search"
            action="/search"
            role="search"
            hidden={!searchOpen}
            className="absolute top-full right-0 z-40 mt-2.5 flex w-[min(20rem,calc(100vw-30px))] border border-black/15 bg-white p-2 shadow-[0_8px_20px_rgba(0,0,0,0.2)]"
          >
            <label htmlFor="site-search" className="sr-only">शोधा</label>
            <input ref={searchInput} id="site-search" name="q" type="search" placeholder="शोधा…" required className="min-w-0 flex-1 border border-black/20 px-3 py-2 text-base" />
            <button type="submit" className="bg-primary px-4 text-white hover:bg-primary-dark">शोधा</button>
          </form>
        </div>
      </div>
    </nav>
  );
}
