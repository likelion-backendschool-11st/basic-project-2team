import React from 'react';
import { Link } from 'react-router-dom';
import type { Category } from '../../data/homeData';
import { homeText } from '../../data/homeData';
import { ROUTES } from '../../data/routes';
import { useCategory } from '../../hooks/useCategory';
import QuickFilterBox from './QuickFilterBox';

interface CategorySidebarProps {
  readonly categories: readonly Category[];
  readonly quickFilters: readonly string[];
  readonly initialActiveId?: string;
}

export const CategorySidebar: React.FC<CategorySidebarProps> = ({ categories, quickFilters, initialActiveId }) => {
  const { activeId, select } = useCategory(initialActiveId ?? categories[0]?.id ?? '');

  return (
    <aside className="col-span-12 md:col-span-3 lg:col-span-2 bg-night-surface border border-night-border rounded-2xl p-4 md:sticky md:top-24 shadow-card-subtle">
      <div className="flex items-center justify-between mb-4 px-2">
        <span className="text-xs font-bold tracking-wider text-fog-muted uppercase">{homeText.categoryTitle}</span>
        <Link to={ROUTES.board} className="text-[11px] px-2 py-0.5 rounded-full bg-mercury/10 text-mercury-light font-medium">
          {homeText.categoryAll}
        </Link>
      </div>
      <nav className="space-y-1.5">
        {categories.map((c) => {
          const active = c.id === activeId;
          return (
            <Link
              key={c.id}
              to={`${ROUTES.board}?category=${c.id}`}
              onClick={() => select(c.id)}
              className={
                active
                  ? 'group flex items-center justify-between px-3.5 py-3 rounded-xl bg-mercury/15 border border-mercury/30 text-white font-semibold transition-all'
                  : 'group flex items-center justify-between px-3.5 py-3 rounded-xl text-fog-sub hover:text-white hover:bg-night-card border border-transparent hover:border-night-border transition-all'
              }
            >
              <div className="flex items-center gap-3">
                <span
                  className={
                    active
                      ? 'w-8 h-8 rounded-lg bg-mercury flex items-center justify-center text-white text-xs shadow-sm'
                      : 'w-8 h-8 rounded-lg bg-night-card group-hover:bg-night-hover flex items-center justify-center text-fog-muted group-hover:text-mercury-light text-xs transition-colors'
                  }
                >
                  <i className={`fa-solid ${c.icon}`} />
                </span>
                <span className={active ? 'text-sm' : 'text-sm font-medium'}>{c.label}</span>
              </div>
              <span
                className={
                  active
                    ? 'text-xs px-2 py-0.5 rounded-full bg-mercury/30 text-indigo-200 font-medium'
                    : 'text-xs text-fog-muted group-hover:text-fog-sub'
                }
              >
                {c.count}
              </span>
            </Link>
          );
        })}
      </nav>
      <QuickFilterBox filters={quickFilters} />
    </aside>
  );
};

export default CategorySidebar;
