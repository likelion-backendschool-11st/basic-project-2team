import React from 'react';
import { boardText, sortOptions, type SortKey, type SortOption } from '../../data/boardData';

interface SortSelectProps {
  readonly value: SortKey;
  readonly onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  readonly options?: readonly SortOption[];
}

export const SortSelect: React.FC<SortSelectProps> = ({ value, onChange, options = sortOptions }) => (
  <div className="flex items-center gap-2">
    <label className="text-xs text-fog-muted font-medium hidden sm:inline" htmlFor="sortOrder">
      {boardText.sortLabel}
    </label>
    <div className="relative">
      <select
        id="sortOrder"
        value={value}
        onChange={onChange}
        className="appearance-none bg-night-base border border-night-border hover:border-night-borderLight text-xs font-medium text-fog-headline py-1.5 pl-3 pr-8 rounded-lg focus:outline-none focus:border-mercury focus:ring-0 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-fog-muted">
        <i className="fa-solid fa-chevron-down text-[10px]" />
      </div>
    </div>
  </div>
);

export default SortSelect;
