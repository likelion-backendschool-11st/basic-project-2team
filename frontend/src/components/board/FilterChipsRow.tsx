import React from 'react';
import { boardText, type FilterChip } from '../../data/boardData';

interface FilterChipsRowProps {
  readonly gameValue: string;
  readonly timeValue: string;
  /** Highlight the time chip (e.g. pre-filtered from the search query). */
  readonly timeActive?: boolean;
  readonly tagFilters: readonly FilterChip[];
  readonly activeTags: readonly string[];
  readonly onToggleTag: (tag: string) => void;
  readonly excludeClosed: boolean;
  readonly onExcludeClosedChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const chipIdle =
  'px-3.5 py-1.5 bg-night-base hover:bg-night-card border border-night-border rounded-lg text-fog-headline flex items-center gap-2 font-medium transition-colors';
const chipActive =
  'px-3.5 py-1.5 bg-mercury/15 hover:bg-mercury/25 border border-mercury/40 rounded-lg text-indigo-200 flex items-center gap-2 font-medium transition-colors';

export const FilterChipsRow: React.FC<FilterChipsRowProps> = ({
  gameValue,
  timeValue,
  timeActive = false,
  tagFilters,
  activeTags,
  onToggleTag,
  excludeClosed,
  onExcludeClosedChange,
}) => (
  <div className="flex items-center flex-wrap gap-2.5 pt-2 border-t border-night-border text-xs">
    <span className="text-fog-muted font-semibold flex items-center gap-1.5 pr-1">
      <i className="fa-solid fa-sliders text-mercury-light" />
      {boardText.filterLabel}
    </span>
    <div className="relative group">
      <button className={chipIdle} type="button">
        <span>
          {boardText.gameFilterLabel}
          <strong className="text-mercury-light font-semibold">{gameValue}</strong>
        </span>
        <i className="fa-solid fa-chevron-down text-[10px] text-fog-muted" />
      </button>
    </div>
    <div className="relative group">
      <button className={timeActive ? chipActive : chipIdle} type="button">
        <i className="fa-regular fa-clock text-xs text-mercury-light" />
        <span>
          {boardText.timeFilterLabel}
          <strong>{timeValue}</strong>
        </span>
        <i className={timeActive ? 'fa-solid fa-chevron-down text-[10px]' : 'fa-solid fa-chevron-down text-[10px] text-fog-muted'} />
      </button>
    </div>
    <div className="flex items-center gap-1.5">
      {tagFilters.map((t) => {
        const active = activeTags.includes(t.value);
        return (
          <button
            key={t.value}
            type="button"
            aria-pressed={active}
            onClick={() => onToggleTag(t.value)}
            className={
              active
                ? 'px-3 py-1.5 bg-mercury/15 border border-mercury/40 rounded-lg text-mercury-light font-medium transition-colors'
                : 'px-3 py-1.5 bg-night-base hover:border-mercury/40 border border-night-border rounded-lg text-fog-sub font-medium transition-colors'
            }
          >
            {t.label}
          </button>
        );
      })}
    </div>
    <label className="ml-auto inline-flex items-center gap-2 cursor-pointer text-fog-sub hover:text-white select-none">
      <input
        checked={excludeClosed}
        onChange={onExcludeClosedChange}
        className="w-4 h-4 rounded bg-night-base border-night-border text-mercury focus:ring-mercury focus:ring-offset-night-deep"
        type="checkbox"
      />
      <span className="font-medium text-xs">{boardText.excludeClosed}</span>
    </label>
  </div>
);

export default FilterChipsRow;
