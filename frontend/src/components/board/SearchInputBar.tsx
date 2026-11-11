import React from 'react';
import { boardText } from '../../data/boardData';

export interface ActiveSearchBadge {
  readonly label: string;
  readonly icon: string;
  readonly clearTitle: string;
  readonly onClear: () => void;
}

interface SearchInputBarProps {
  readonly badge?: ActiveSearchBadge;
  readonly placeholder: string;
  readonly value: string;
  readonly onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  readonly resultCount: number;
  readonly submitLabel: string;
  readonly onReset: () => void;
}

export const SearchInputBar: React.FC<SearchInputBarProps> = ({
  badge,
  placeholder,
  value,
  onChange,
  onSubmit,
  resultCount,
  submitLabel,
  onReset,
}) => (
  <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
    <form
      role="search"
      onSubmit={onSubmit}
      className="flex-1 flex items-center gap-3 bg-night-base border border-night-border rounded-xl px-4 py-3 focus-within:border-mercury transition-all shadow-inner"
    >
      <i className="fa-solid fa-magnifying-glass text-fog-muted text-sm" />
      <div className="flex items-center gap-2 flex-wrap flex-1 text-sm">
        <span className="text-fog-muted text-xs font-semibold uppercase tracking-wider">{boardText.searchLabel}</span>
        {badge && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-mercury/20 border border-mercury/40 text-mercury-light text-xs font-bold rounded-lg shadow-sm">
            <i className={`${badge.icon} text-[10px]`} />
            {badge.label}
            <button className="hover:text-white transition-colors" title={badge.clearTitle} type="button" onClick={badge.onClear}>
              <i className="fa-solid fa-xmark text-xs" />
            </button>
          </span>
        )}
        <input
          className="bg-transparent text-sm text-fog-headline placeholder-fog-muted focus:outline-none flex-1 min-w-[160px] border-none p-0 focus:ring-0"
          placeholder={placeholder}
          type="text"
          value={value}
          onChange={onChange}
        />
      </div>
      <div className="text-xs bg-night-deep px-3 py-1.5 rounded-lg border border-night-border text-fog-sub font-medium shrink-0">
        {boardText.resultPrefix}
        <span className="text-mercury-light font-bold text-sm">{resultCount}</span>
        {boardText.resultSuffix}
      </div>
      <button className="px-3 py-1.5 bg-mercury hover:bg-mercury-dark text-white text-xs font-medium rounded-lg shadow transition-colors shrink-0" type="submit">
        {submitLabel}
      </button>
    </form>
    <div className="flex items-center gap-2 self-end lg:self-center">
      <button
        className="text-xs px-3 py-2 text-fog-muted hover:text-white bg-night-base border border-night-border rounded-lg flex items-center gap-1.5 transition-colors"
        type="button"
        onClick={onReset}
      >
        <i className="fa-solid fa-arrow-rotate-right" />
        {boardText.resetButton}
      </button>
    </div>
  </div>
);

export default SearchInputBar;
