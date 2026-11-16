import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import type { PostCardData } from '@/lib/data';

/** Main column plus a sticky sidebar from 1024px; stacked below that. */
export function ContentLayout({ children, sidebar = true, sidebarPosts, sidebarTitle }: { children: ReactNode; sidebar?: boolean; sidebarPosts?: PostCardData[]; sidebarTitle?: string }) {
  return (
    <div className={`grid gap-10 ${sidebar ? 'lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-12' : ''}`}>
      <div id="primary" className="min-w-0">{children}</div>
      {sidebar && <Sidebar posts={sidebarPosts} title={sidebarTitle} />}
    </div>
  );
}

/** Archive grid: single column of compact rows on phones, two columns of image cards from 640px. */
export function CardGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`grid grid-cols-1 gap-x-5 sm:grid-cols-2 sm:gap-y-8 xl:grid-cols-2 ${className}`}>{children}</div>;
}
