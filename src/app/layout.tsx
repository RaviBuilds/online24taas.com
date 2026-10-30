import type { ReactNode } from 'react';

export const metadata = {
  title: 'Online24Taas',
  description: 'All Interesting Facts — Marathi',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="mr">
      <body>{children}</body>
    </html>
  );
}
