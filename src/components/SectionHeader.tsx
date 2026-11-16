import Link from './AppLink';
import { Icon } from './Icon';
import type { Tone } from '@/lib/present';

/** Named section header: coloured marker, title and a "सर्व पहा" link. */
export function SectionHeader({ id, title, href, tone = 'red', as: Tag = 'h2' }: { id?: string; title: string; href?: string; tone?: Tone; as?: 'h2' | 'h3' }) {
  return (
    <div className="sec-head" data-tone={tone}>
      <Tag id={id}>{title}</Tag>
      {href && (
        <Link href={href} className="more">
          सर्व पहा <Icon name="arrowRight" className="size-4" />
        </Link>
      )}
    </div>
  );
}
