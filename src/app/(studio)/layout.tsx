import type { ReactNode } from 'react';

// Studio has its own root layout so site CSS (Tailwind preflight, fonts) never touches it.
export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
