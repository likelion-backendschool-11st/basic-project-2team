import React from 'react';
import { boardText, timeSlotOptions, type FilterChip } from '../../data/boardData';

interface FilterChipsRowProps {
  /** 게임 드롭다운: 선택값(게임 코드, 전체는 ''), 선택지, 전체 항목 문구 */
  readonly game: string;
  readonly gameOptions: readonly { readonly code: string; readonly name: string }[];
  readonly gameAllLabel: string;
  readonly onGameChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  /** 시간대 드롭다운: 선택값(dawn|morning|afternoon|evening, 전체는 '') */
  readonly time: string;
  readonly timeAllLabel: string;
  readonly onTimeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
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

const selectStyle =
  'bg-transparent border-0 p-0 pr-5 text-xs font-semibold text-mercury-light focus:ring-0 cursor-pointer [&>option]:bg-night-base [&>option]:text-fog-headline';

export const FilterChipsRow: React.FC<FilterChipsRowProps> = ({
  game,
  gameOptions,
  gameAllLabel,
  onGameChange,
  time,
  timeAllLabel,
  onTimeChange,
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
    <label className={game ? chipActive : chipIdle}>
      <span>{boardText.gameFilterLabel}</span>
      <select value={game} onChange={onGameChange} className={selectStyle}>
        <option value="">{gameAllLabel}</option>
        {gameOptions.map((g) => (
          <option key={g.code} value={g.code}>
            {g.name}
          </option>
        ))}
      </select>
    </label>
    <label className={time || timeActive ? chipActive : chipIdle}>
      <i className="fa-regular fa-clock text-xs text-mercury-light" />
      <span>{boardText.timeFilterLabel}</span>
      <select value={time} onChange={onTimeChange} className={selectStyle}>
        <option value="">{timeAllLabel}</option>
        {timeSlotOptions.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
    </label>
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
