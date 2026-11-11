import React from 'react';
import type { ActivityTab } from '../../data/myPageData';

interface ActivityTabsProps {
  readonly tabs: readonly { readonly id: ActivityTab; readonly label: string; readonly badge?: string }[];
  readonly isActive: (id: ActivityTab) => boolean;
  readonly onSelect: (id: ActivityTab) => void;
}

/** 게시글 | 댓글 tab switcher. */
export const ActivityTabs: React.FC<ActivityTabsProps> = ({ tabs, isActive, onSelect }) => (
  <div className="flex items-center gap-2" role="tablist">
    {tabs.map((t) => {
      const active = isActive(t.id);
      return (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onSelect(t.id)}
          className={
            active
              ? 'px-4 py-2 rounded-xl text-sm font-bold bg-mercury text-white shadow-sm shadow-mercury/20 transition-all flex items-center gap-1.5'
              : 'px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-night-card transition-all flex items-center gap-1.5'
          }
        >
          <span>{t.label}</span>
          {t.badge && (
            <span className={`text-[11px] px-1.5 rounded-full font-semibold ${active ? 'bg-white/20 text-white' : 'bg-night-card text-slate-400'}`}>
              {t.badge}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export default ActivityTabs;
