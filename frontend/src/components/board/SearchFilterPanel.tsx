import React from 'react';

interface SearchFilterPanelProps {
  readonly children: React.ReactNode;
}

/** Card wrapper for the search bar + detailed filter rows. */
export const SearchFilterPanel: React.FC<SearchFilterPanelProps> = ({ children }) => (
  <section className="bg-night-surface/70 border border-night-border rounded-2xl p-5 shadow-lg backdrop-blur-sm space-y-4">
    {children}
  </section>
);

export default SearchFilterPanel;
