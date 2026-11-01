import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

/** Main column (70%) plus right sidebar (30%) on ≥1024px, stacked below that, like Adore News ".theme-wrap". */
export function ContentLayout({ children, sidebar = true }: { children: ReactNode; sidebar?: boolean }) {
  return (
    <div className={`grid gap-[30px] ${sidebar ? 'lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]' : ''}`}>
      <div id="primary" className="min-w-0">{children}</div>
      {sidebar && <Sidebar />}
    </div>
  );
}

/** Responsive card grid: 3 columns, 2 below 769px, 1 below 601px (theme-archive-layout grid-column-3). */
export function CardGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`grid grid-cols-1 gap-x-2.5 gap-y-8 min-[601px]:grid-cols-2 min-[769px]:grid-cols-3 ${className}`}>{children}</div>;
}
