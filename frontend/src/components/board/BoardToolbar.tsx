import React from 'react';
import { boardText, type SortKey } from '../../data/boardData';
import SortSelect from './SortSelect';

interface BoardToolbarProps {
  /** Context text after the "실시간 매칭 리스트 |" label. */
  readonly summary: React.ReactNode;
  readonly sort: SortKey;
  readonly onSortChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export const BoardToolbar: React.FC<BoardToolbarProps> = ({ summary, sort, onSortChange }) => (
  <div className="flex items-center justify-between bg-night-surface border border-night-border px-4 py-3 rounded-2xl">
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      <span className="text-xs font-semibold text-fog-sub">{boardText.liveList}</span>
      <span className="text-xs text-fog-muted">|</span>
      <span className="text-xs text-fog-muted font-medium">{summary}</span>
    </div>
    <SortSelect value={sort} onChange={onSortChange} />
  </div>
);

export default BoardToolbar;
