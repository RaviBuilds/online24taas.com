import { Icon, socialIcon } from './Icon';

/** Social links from Site settings. Icon buttons (44px+) with the label as the accessible name. */
export function SocialLinks({ links, variant = 'light', showLabels = false }: { links: { label: string; url: string }[]; variant?: 'light' | 'dark'; showLabels?: boolean }) {
  const tone = variant === 'dark' ? 'border-white/20 text-white hover:border-saffron hover:text-saffron' : 'border-line bg-surface text-ink hover:border-brand hover:text-brand-dark';
  return (
    <ul className="flex flex-wrap gap-2" aria-label="सोशल मीडिया">
      {links.map((s) => (
        <li key={s.url + s.label}>
          <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label} className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border px-3 transition-colors duration-150 ${tone}`}>
            <Icon name={socialIcon(s.label)} className="size-5" />
            {showLabels && <span className="text-sm font-semibold">{s.label}</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}
