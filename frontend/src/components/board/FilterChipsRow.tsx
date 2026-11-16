import React from 'react';
import { boardText, headcountOptions, partyTypeOptions, playStyleOptions, scheduleDayOptions, timeSlotOptions, type FilterChip } from '../../data/boardData';
import type { Game } from '../../api/gameApi';
import type { DetailFilter } from '../../hooks/useBoardFilter';

interface FilterChipsRowProps {
  /** 게임 드롭다운: 선택값(게임 코드, 전체는 ''), 선택지, 전체 항목 문구 */
  readonly game: string;
  readonly gameOptions: readonly Game[];
  readonly gameAllLabel: string;
  readonly onGameChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  /** 시간대 드롭다운: 선택값(dawn|morning|afternoon|evening, 전체는 '') */
  readonly time: string;
  readonly timeAllLabel: string;
  readonly onTimeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  /** Highlight the time chip (e.g. pre-filtered from the search query). */
  readonly timeActive?: boolean;
  /** 상세 필터(유형·스타일·인원·일정·음성 필수) 값과 변경 핸들러 */
  readonly detail: DetailFilter;
  readonly onDetailChange: <K extends keyof DetailFilter>(key: K, value: DetailFilter[K]) => void;
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
  'bg-transparent border-0 p-0 pr-7 text-xs font-semibold text-mercury-light focus:ring-0 cursor-pointer [&>option]:bg-night-base [&>option]:text-fog-headline';

/** 라벨 + 드롭다운 칩. 값이 있으면 강조 색 */
const SelectChip: React.FC<{
  readonly label: string;
  readonly allLabel: string;
  readonly options: readonly { readonly value: string; readonly label: string }[];
  readonly value: string;
  readonly onChange: (value: string) => void;
}> = ({ label, allLabel, options, value, onChange }) => (
  <label className={value ? chipActive : chipIdle}>
    <span>{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)} className={selectStyle}>
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </label>
);

export const FilterChipsRow: React.FC<FilterChipsRowProps> = ({
  game,
  gameOptions,
  gameAllLabel,
  onGameChange,
  time,
  timeAllLabel,
  onTimeChange,
  timeActive = false,
  detail,
  onDetailChange,
  tagFilters,
  activeTags,
  onToggleTag,
  excludeClosed,
  onExcludeClosedChange,
}) => {
  // 게임 → 모집 유형 → 상세 분류 순으로 선택지가 좁혀집니다. 유형·상세 분류 칩은 윗 단계를 고른 뒤에만 보입니다.
  const contents = gameOptions.find((g) => g.code === game)?.contents ?? [];
  const typeChoices = partyTypeOptions.filter((t) => contents.some((c) => c.type === t.value));
  const detailChoices = contents.filter((c) => c.type === detail.type).map((c) => ({ value: c.code, label: c.name }));
  return (
  <div className="space-y-2.5 pt-2 border-t border-night-border text-xs">
    <div className="flex items-center flex-wrap gap-2.5">
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
    {/* 글쓰기처럼 게임을 고르면 모집 유형, 모집 유형을 고르면 상세 분류가 나타납니다. */}
    {game && (
      <SelectChip label={boardText.typeFilterLabel} allLabel={boardText.typeFilterAll} options={typeChoices} value={detail.type} onChange={(v) => onDetailChange('type', v)} />
    )}
    {game && detail.type && (
      <SelectChip label={boardText.detailFilterLabel} allLabel={boardText.detailFilterAll} options={detailChoices} value={detail.detail} onChange={(v) => onDetailChange('detail', v)} />
    )}
    </div>
    <div className="flex items-center flex-wrap gap-2.5">
    {/* 일정(날짜)과 시간대는 한 묶음으로 보여줍니다. */}
    <div className={`${detail.date || time || timeActive ? chipActive : chipIdle} !gap-3`}>
      <i className="fa-regular fa-calendar text-xs text-mercury-light" />
      <label className="flex items-center gap-1.5">
        <span>{boardText.dateFilterLabel}</span>
        <select value={detail.date} onChange={(e) => onDetailChange('date', e.target.value)} className={selectStyle}>
          <option value="">{boardText.dateFilterAll}</option>
          {scheduleDayOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <span className="h-4 w-px bg-night-border" />
      <label className="flex items-center gap-1.5">
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
    </div>
    <SelectChip label={boardText.styleFilterLabel} allLabel={boardText.styleFilterAll} options={playStyleOptions} value={detail.style} onChange={(v) => onDetailChange('style', v)} />
    <SelectChip label={boardText.headcountFilterLabel} allLabel={boardText.headcountFilterAll} options={headcountOptions} value={detail.headcount} onChange={(v) => onDetailChange('headcount', v)} />
    <button type="button" aria-pressed={detail.voice} onClick={() => onDetailChange('voice', !detail.voice)} className={detail.voice ? chipActive : chipIdle}>
      <i className="fa-solid fa-microphone text-xs text-mercury-light" />
      {boardText.voiceOnly}
    </button>
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
  </div>
  );
};

export default FilterChipsRow;
