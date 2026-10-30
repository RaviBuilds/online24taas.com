import type { Metadata, Viewport } from 'next';
import Studio from './studio';

export const dynamic = 'force-static';

// Same values as next-sanity/studio's `viewport`/`metadata`, declared locally:
// route segment config (metadata/viewport/dynamic) may only be exported from
// Server Components.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Studio uses display-cutout CSS (iPhone notch) and needs viewport-fit=cover
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  referrer: 'same-origin',
  robots: 'noindex',
};

// Local-only Studio for content modeling + validation. All Studio/sanity.config
// imports live in ./studio (a Client Component) so the `sanity` package is never
// evaluated in the RSC layer.
export default function StudioPage() {
  return <Studio />;
}
