'use client';
import Link from 'next/link';
import { useState } from 'react';

export function MobileNav({ links }: { links: { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button type="button" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen((o) => !o)} className="px-3 py-3 text-sm font-semibold">
        {open ? '✕ बंद' : '☰ मेनू'}
      </button>
      {open && (
        <ul id="mobile-menu" className="absolute inset-x-0 z-40 border-y border-neutral-200 bg-white shadow-lg">
          {links.map((l) => (
            <li key={l.href + l.label} className="border-b border-neutral-100 last:border-0">
              <Link href={l.href} onClick={() => setOpen(false)} className="block px-4 py-3">{l.label}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
