import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Noto_Sans_Devanagari, Roboto } from 'next/font/google';
import '../globals.css';
import Script from 'next/script';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getSite } from '@/lib/data';
import { parseImageRef, sanityLoader } from '@/sanity/lib/image';
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/lib/site';

// Marathi-first typography: Noto Sans Devanagari covers matras/conjuncts with correct metrics;
// Roboto is only used for Latin text and digits that fall outside the Devanagari subset.
const devanagari = Noto_Sans_Devanagari({ subsets: ['devanagari', 'latin'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-devanagari' });
const roboto = Roboto({ subsets: ['latin'], weight: ['400', '500', '700'], display: 'swap', variable: '--font-roboto' });

const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} - ${SITE_TAGLINE}`, template: `%s | ${SITE_NAME}` },
  description: SITE_TAGLINE,
  openGraph: { siteName: SITE_NAME, locale: 'mr_IN', type: 'website' },
  twitter: { card: 'summary_large_image' },
  alternates: { types: { 'application/rss+xml': `${SITE_URL}/feed.xml` } },
};

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  const ref = site.settings?.faviconRef;
  const parsed = ref ? parseImageRef(ref) : null;
  if (!parsed) return baseMetadata;
  const icon = sanityLoader({ src: parsed.url, width: 96 });
  return { ...baseMetadata, icons: { icon, apple: icon } };
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#c80815' };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const site = await getSite();
  const adsId = site.settings?.adsensePublisherId;
  // AdSense only on the real production deployment (never previews / local), as before in WordPress.
  const showAds = !!adsId && process.env.VERCEL_ENV === 'production';
  return (
    <html lang="mr" className={`${devanagari.variable} ${roboto.variable}`}>
      <body>
        <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3">मुख्य मजकुराकडे जा</a>
        <Header site={site} />
        <main id="content">{children}</main>
        <Footer site={site} />
        {showAds && <Script id="adsense" async crossOrigin="anonymous" strategy="afterInteractive" src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsId}`} />}
      </body>
    </html>
  );
}
