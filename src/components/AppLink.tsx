import Link from 'next/link';
import type { ComponentProps } from 'react';

/**
 * next/link with viewport prefetching off. A news page links to dozens of articles; prefetching all of them wastes
 * bandwidth and function invocations, and in Firefox aborted prefetches made the router fall back to full page
 * reloads (seen as an extra navigation racing the next click). Pages are cached at the edge, so a click is still fast.
 */
export default function AppLink({ prefetch = false, ...props }: ComponentProps<typeof Link>) {
  return <Link prefetch={prefetch} {...props} />;
}
