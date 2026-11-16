import type { SVGProps } from 'react';

// One stroke-icon set (24px grid, 2px stroke, round caps). Decorative by default.
const paths = {
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  arrowRight: <path d="M5 12h14m-6-6 6 6-6 6" />,
  arrowLeft: <path d="M19 12H5m6-6-6 6 6 6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  up: <path d="m6 14 6-6 6 6" />,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  mail: <><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" /><path d="m4 8 8 5.5L20 8" /></>,
  whatsapp: <><path d="M4 20l1.2-4.1A8 8 0 1 1 8.2 19z" /><path d="M9.2 9c.2 2.4 2.6 4.8 5.1 5.4l1.2-1.2-1.8-1-.9.7c-.9-.4-1.6-1.1-2-2l.7-.9-1-1.8z" /></>,
  facebook: <path d="M14 8.5h2.5V5H14a3.5 3.5 0 0 0-3.5 3.5V11H8v3.5h2.5V20H14v-5.5h2.5L17 11h-3V8.8c0-.2.1-.3.3-.3z" />,
  x: <path d="m5 5 14 14M19 5 5 19" />,
  telegram: <path d="M20 5 3.8 11.4l5 1.7 1.6 5 2.7-3.3 4.3 3.2zM8.8 13.1 20 5" />,
  instagram: <><rect x="4" y="4" width="16" height="16" rx="4.5" /><circle cx="12" cy="12" r="3.6" /><circle cx="17" cy="7" r=".6" /></>,
  share: <><circle cx="6" cy="12" r="2.2" /><circle cx="17.5" cy="6" r="2.2" /><circle cx="17.5" cy="18" r="2.2" /><path d="m8 11 7.5-4M8 13l7.5 4" /></>,
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, className = 'size-5', ...rest }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...rest}>
      {paths[name]}
    </svg>
  );
}

/** Maps a social label from Site settings to an icon. Unknown labels fall back to a link icon. */
export function socialIcon(label: string): IconName {
  const l = label.toLowerCase();
  if (l.includes('facebook')) return 'facebook';
  if (l.includes('insta')) return 'instagram';
  if (l.includes('twitter') || l === 'x') return 'x';
  if (l.includes('mail')) return 'mail';
  if (l.includes('telegram')) return 'telegram';
  if (l.includes('whatsapp')) return 'whatsapp';
  return 'link';
}
