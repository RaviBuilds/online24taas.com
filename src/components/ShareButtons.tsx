'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from './Icon';
import { facebookHref, telegramHref, whatsappHref, xHref } from '@/lib/share';

type Item = { name: string; label: string; icon: IconName; href: string };

function items(url: string, title: string): Item[] {
  return [
    { name: 'WhatsApp', label: 'WhatsApp', icon: 'whatsapp', href: whatsappHref(title, url) },
    { name: 'Facebook', label: 'Facebook', icon: 'facebook', href: facebookHref(url) },
    { name: 'X', label: 'X', icon: 'x', href: xHref(title, url) },
    { name: 'Telegram', label: 'Telegram', icon: 'telegram', href: telegramHref(title, url) },
  ];
}
function useCopy(url: string) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const text = url;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older in-app browsers: fall back to a temporary textarea.
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* nothing else to try */ }
      ta.remove();
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };
  return { copied, copy };
}

const btn = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 text-[0.9375rem] font-bold text-ink transition-[background-color,border-color,scale] duration-150 hover:border-ink active:scale-[0.97]';

/** Inline share row below the article: WhatsApp first, then Facebook, X, Telegram and copy link. */
export function ShareButtons({ url, title }: { url: string; title: string }) {
  const { copied, copy } = useCopy(url);
  const list = items(url, title);
  return (
    <div>
      <p className="mb-2.5 text-[0.9375rem] font-extrabold">शेअर करा</p>
      <div className="flex flex-wrap gap-2">
        <a href={list[0].href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#15803d] px-5 text-[0.9375rem] font-extrabold text-white transition-[background-color,scale] duration-150 hover:bg-[#116530] active:scale-[0.97]">
          <Icon name="whatsapp" className="size-5" /> WhatsApp
        </a>
        {list.slice(1).map((l) => (
          <a key={l.name} href={l.href} target="_blank" rel="noopener noreferrer" className={btn}><Icon name={l.icon} className="size-5" /> {l.label}</a>
        ))}
        <button type="button" onClick={copy} className={btn}>
          <Icon name={copied ? 'check' : 'link'} className="size-5" />
          <span aria-live="polite">{copied ? 'लिंक कॉपी झाली' : 'लिंक कॉपी करा'}</span>
        </button>
      </div>
    </div>
  );
}

/** Sticky bottom bar for phones. Solid background (no blur) so it behaves in in-app browsers; respects safe-area insets. */
export function ShareBar({ url, title }: { url: string; title: string }) {
  const { copied, copy } = useCopy(url);
  const list = items(url, title);
  const round = 'inline-flex size-11 items-center justify-center rounded-full border border-line bg-surface text-ink active:scale-95';
  return (
    <div className="sharebar fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_16px_-10px_rgba(20,17,15,0.4)] lg:hidden">
      <div className="mx-auto flex max-w-xl items-center gap-2 px-[var(--gutter)] py-2">
        <a href={list[0].href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#15803d] px-4 font-extrabold text-white active:scale-[0.98]">
          <Icon name="whatsapp" className="size-5" /> WhatsApp वर शेअर करा
        </a>
        <a href={list[1].href} target="_blank" rel="noopener noreferrer" aria-label="Facebook वर शेअर करा" className={round}><Icon name="facebook" className="size-5" /></a>
        <button type="button" onClick={copy} aria-label={copied ? 'लिंक कॉपी झाली' : 'लिंक कॉपी करा'} className={round}><Icon name={copied ? 'check' : 'link'} className="size-5" /></button>
      </div>
    </div>
  );
}
