// Global next/image loader (next.config images.loaderFile). All images are served by Sanity's CDN,
// which resizes and converts to AVIF/WebP itself, so Vercel's image optimiser is bypassed.
export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  const u = new URL(src);
  u.searchParams.set('w', String(width));
  u.searchParams.set('q', String(quality ?? 75));
  u.searchParams.set('auto', 'format');
  u.searchParams.set('fit', 'max');
  return u.toString();
}
