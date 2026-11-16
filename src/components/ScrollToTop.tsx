'use client';
import { useEffect, useState } from 'react';
import { Icon } from './Icon';

export function ScrollToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!show) return null;
  return (
    <button
      type="button"
      aria-label="वर जा"
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}
      className="to-top fixed right-4 bottom-4 z-30 flex size-12 items-center justify-center rounded-full bg-ink text-white shadow-[0_6px_18px_-6px_rgba(0,0,0,0.5)] transition-colors hover:bg-brand"
    >
      <Icon name="up" className="size-5" strokeWidth={2.5} />
    </button>
  );
}
