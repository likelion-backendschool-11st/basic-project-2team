import React from 'react';
import { useSearch } from '../../hooks/useSearch';

interface SearchBarProps {
  readonly placeholder: string;
  readonly initialQuery?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ placeholder, initialQuery = '' }) => {
  const { query, onChange, onSubmit } = useSearch(initialQuery);
  return (
    <form className="relative w-full" onSubmit={onSubmit} role="search">
      <div className="relative flex items-center">
        <div className="absolute left-4 flex items-center pointer-events-none text-mercury-light">
          <i className="fa-solid fa-magnifying-glass text-base" />
        </div>
        <input
          className="w-full pl-12 pr-14 py-3.5 rounded-2xl bg-night-surface border border-night-border focus:border-mercury focus:ring-2 focus:ring-mercury/30 text-fog-headline placeholder-fog-muted text-sm shadow-card-subtle transition-all outline-none"
          placeholder={placeholder}
          type="text"
          value={query}
          onChange={onChange}
        />
        <div className="absolute right-3.5 flex items-center">
          <kbd className="px-2.5 py-1 text-[11px] font-semibold text-fog-muted bg-night-card border border-night-borderLight rounded-lg shadow-sm">
            <i className="fa-solid fa-arrow-turn-down fa-rotate-90 text-[10px] mr-0.5" /> ↵
          </kbd>
        </div>
      </div>
    </form>
  );
};

export default SearchBar;
