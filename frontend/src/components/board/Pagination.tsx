import React from 'react';
import { boardText } from '../../data/boardData';

interface PaginationProps {
  readonly page: number;
  readonly pages: readonly number[];
  readonly hasPrev: boolean;
  readonly hasNext: boolean;
  readonly onPrev: () => void;
  readonly onNext: () => void;
  readonly onGoTo: (page: number) => void;
}

const base = 'w-9 h-9 flex items-center justify-center rounded-lg transition-colors';
const idle = `${base} bg-night-surface border border-night-border text-fog-sub hover:text-white`;

export const Pagination: React.FC<PaginationProps> = ({ page, pages, hasPrev, hasNext, onPrev, onNext, onGoTo }) => (
  <nav aria-label="Pagination" className="flex items-center gap-1.5">
    <button
      type="button"
      aria-label={boardText.prevPage}
      disabled={!hasPrev}
      onClick={onPrev}
      className={`${idle} hover:border-night-borderLight disabled:opacity-40 disabled:pointer-events-none`}
    >
      <i className="fa-solid fa-chevron-left text-xs" />
    </button>
    {pages.map((p) => (
      <button
        key={p}
        type="button"
        aria-current={p === page ? 'page' : undefined}
        onClick={() => onGoTo(p)}
        className={
          p === page
            ? `${base} bg-mercury text-white text-xs font-bold shadow-glow-mercury border border-mercury-light`
            : `${idle} hover:bg-night-card text-xs font-medium`
        }
      >
        {p}
      </button>
    ))}
    <button
      type="button"
      aria-label={boardText.nextPage}
      disabled={!hasNext}
      onClick={onNext}
      className={`${idle} hover:border-night-borderLight disabled:opacity-40 disabled:pointer-events-none`}
    >
      <i className="fa-solid fa-chevron-right text-xs" />
    </button>
  </nav>
);

export default Pagination;
