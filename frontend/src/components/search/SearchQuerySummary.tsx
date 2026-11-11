import React from 'react';
import { searchText } from '../../data/searchData';

interface SearchQuerySummaryProps {
  readonly query: string;
}

/** Toolbar context text: 검색어 "<q>" 관련 게시글 (or 전체 게시글 when q is empty). */
export const SearchQuerySummary: React.FC<SearchQuerySummaryProps> = ({ query }) =>
  query ? (
    <>
      {searchText.relatedPrefix}
      <strong className="text-white">{query}</strong>
      {searchText.relatedSuffix}
    </>
  ) : (
    <>{searchText.allResults}</>
  );

export default SearchQuerySummary;
