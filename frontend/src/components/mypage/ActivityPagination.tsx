import React from 'react';

interface ActivityPaginationProps {
  readonly rangeLabel: string;
  readonly pages: readonly number[];
  readonly current: number;
  readonly hasPrev: boolean;
  readonly hasNext: boolean;
  readonly prevLabel: string;
  readonly nextLabel: string;
  readonly onPrev: () => void;
  readonly onNext: () => void;
  readonly onSelect: (page: number) => void;
}

const idleBtn = 'px-2.5 py-1 rounded bg-night-card border border-night-borderLight text-xs text-slate-400 hover:text-white disabled:opacity-50';

export const ActivityPagination: React.FC<ActivityPaginationProps> = ({
  rangeLabel,
  pages,
  current,
  hasPrev,
  hasNext,
  prevLabel,
  nextLabel,
  onPrev,
  onNext,
  onSelect,
}) => (
  <div className="flex items-center justify-between pt-1">
    <span className="text-xs text-slate-400 font-medium">{rangeLabel}</span>
    <div className="flex items-center space-x-1">
      <button type="button" className={idleBtn} disabled={!hasPrev} onClick={onPrev}>
        {prevLabel}
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onSelect(p)}
          className={p === current ? 'px-2.5 py-1 rounded bg-mercury text-xs font-bold text-white' : idleBtn}
        >
          {p}
        </button>
      ))}
      <button type="button" className={idleBtn} disabled={!hasNext} onClick={onNext}>
        {nextLabel}
      </button>
    </div>
  </div>
);

export default ActivityPagination;
