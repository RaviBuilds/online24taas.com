import { PortableText, type PortableTextComponents } from '@portabletext/react';
import type { PortableTextBlock } from '@portabletext/types';
import Link from 'next/link';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { SanityImage } from './SanityImage';

// WordPress core palette used by the original colour marks.
const COLORS: Record<string, string> = {
  'vivid-red': '#cf2e2e',
  'vivid-cyan-blue': '#0693e3',
  'vivid-purple': '#9b51e0',
  'luminous-vivid-orange': '#ff6900',
  'vivid-green-cyan': '#00d084',
  black: '#000000',
};

const isInternal = (href: string) => href.startsWith('/') && !href.startsWith('//');

const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p>{children}</p>,
    center: ({ children }) => <p className="text-center">{children}</p>,
    h1: ({ children }) => <h2 className="text-3xl">{children}</h2>, // one <h1> per page: the article title
    h2: ({ children }) => <h2>{children}</h2>,
    h3: ({ children }) => <h3>{children}</h3>,
    h4: ({ children }) => <h4>{children}</h4>,
    h5: ({ children }) => <h5 className="font-bold">{children}</h5>,
    h6: ({ children }) => <h6 className="font-bold">{children}</h6>,
    blockquote: ({ children }) => <blockquote>{children}</blockquote>,
  },
  marks: {
    underline: ({ children }) => <u>{children}</u>,
    'strike-through': ({ children }) => <s>{children}</s>,
    highlight: ({ children }) => <mark className="bg-yellow-200">{children}</mark>,
    code: ({ children }) => <code className="rounded bg-neutral-100 px-1">{children}</code>,
    sup: ({ children }) => <sup>{children}</sup>,
    sub: ({ children }) => <sub>{children}</sub>,
    textColor: ({ value, children }) => <span style={{ color: COLORS[value?.color] ?? 'inherit' }}>{children}</span>,
    link: ({ value, children }) => {
      const href: string = value?.href ?? '#';
      if (/^\s*javascript:/i.test(href)) return <>{children}</>;
      return isInternal(href) ? <Link href={href}>{children}</Link> : <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
    },
  },
  list: {
    bullet: ({ children }) => <ul>{children}</ul>,
    number: ({ children }) => <ol>{children}</ol>,
  },
  types: {
    image: ({ value }) => (
      <figure>
        <SanityImage imageRef={value?.ref ?? value?.asset?._ref} alt={value?.alt || value?.caption || ''} sizes="(min-width: 1024px) 760px, 100vw" />
        {value?.caption ? <figcaption>{value.caption}</figcaption> : null}
      </figure>
    ),
    // Sanitised on the server; iframes only for allow-listed hosts (see lib/sanitizeHtml).
    rawHtml: ({ value }) => <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(value?.html || '') }} />,
  },
};

export function PortableTextRenderer({ value }: { value?: PortableTextBlock[] | null }) {
  if (!value?.length) return null;
  return (
    <div className="entry-content">
      <PortableText value={value} components={components} />
    </div>
  );
}
