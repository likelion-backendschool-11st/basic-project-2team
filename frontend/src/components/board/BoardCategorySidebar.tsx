import React from 'react';
import { Link } from 'react-router-dom';
import { boardCategories, boardText, type BoardCategory, type BoardCategoryId } from '../../data/boardData';
import { ROUTES } from '../../data/routes';
import PartyTipCard from './PartyTipCard';

interface BoardCategorySidebarProps {
  readonly activeId: BoardCategoryId;
  readonly categories?: readonly BoardCategory[];
}

/**
 * Board-layout category nav. Separate from home/CategorySidebar because this design
 * has "전체 카테고리"/Steam rows, a 3-col width, a tip card and URL-driven active state.
 */
export const BoardCategorySidebar: React.FC<BoardCategorySidebarProps> = ({ activeId, categories = boardCategories }) => (
  <aside className="lg:col-span-3 space-y-4">
    <div className="bg-night-surface border border-night-border rounded-2xl p-4 shadow-md">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-night-border">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-layer-group text-mercury-light text-sm" />
          <h2 className="text-sm font-bold text-white tracking-wide">{boardText.categoryTitle}</h2>
        </div>
        <Link
          to={`${ROUTES.board}?category=all`}
          className="text-[11px] font-bold text-mercury-light bg-mercury/10 hover:bg-mercury/20 px-2 py-0.5 rounded transition-colors"
        >
          {boardText.categoryAll}
        </Link>
      </div>
      <ul className="space-y-1.5 text-sm">
        {categories.map((c) => {
          const active = c.id === activeId;
          return (
            <li key={c.id}>
              <Link
                to={`${ROUTES.board}?category=${c.id}`}
                aria-current={active ? 'page' : undefined}
                className={
                  active
                    ? 'flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-mercury/15 text-white border border-mercury/30 font-semibold group transition-all'
                    : 'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-fog-sub hover:text-white hover:bg-night-card border border-transparent group transition-all'
                }
              >
                <span className="flex items-center gap-3">
                  <i className={`${c.icon} w-4 text-center ${active ? 'text-mercury-light' : 'text-fog-muted group-hover:text-mercury-light'}`} />
                  <span>{c.label}</span>
                </span>
                <span className={active ? 'text-xs px-2 py-0.5 rounded-full bg-mercury text-white font-bold' : 'text-xs text-fog-muted font-mono'}>
                  {c.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
    <PartyTipCard />
  </aside>
);

export default BoardCategorySidebar;
