import React from 'react';
import BoardLayout from '../components/board/BoardLayout';
import SearchFilterPanel from '../components/board/SearchFilterPanel';
import SearchInputBar from '../components/board/SearchInputBar';
import FilterChipsRow from '../components/board/FilterChipsRow';
import BoardCategorySidebar from '../components/board/BoardCategorySidebar';
import BoardToolbar from '../components/board/BoardToolbar';
import PostTable from '../components/board/PostTable';
import BoardFooterControls from '../components/board/BoardFooterControls';
import SearchQuerySummary from '../components/search/SearchQuerySummary';
import { boardText } from '../data/boardData';
import { searchTagFilters, searchText } from '../data/searchData';
import { useSearchResults } from '../hooks/useSearchResults';
import { useBoardCategory } from '../hooks/useBoardCategory';
import { useBoardFilterState } from '../hooks/useBoardFilter';
import { useBoardList } from '../hooks/useBoardList';

interface SearchResultsPageProps {
  readonly className?: string;
}

/** Stitch screen: "검색 결과 페이지" (59724bb63c7a498ab3b6a4dc4d2bd191). Route: /search?q= */
export const SearchResultsPage: React.FC<SearchResultsPageProps> = () => {
  const search = useSearchResults();
  // 검색어는 URL(?q=)이 정하고, 태그 · 마감 제외 · 정렬은 이 화면의 필터 상태입니다. 전체 카테고리에서 서버가 검색합니다.
  const filter = useBoardFilterState();
  const { categories } = useBoardCategory();
  const { posts, total, loading, error, pagination: pg } = useBoardList('all', { ...filter, text: search.q });
  const timeLabel = searchText.timeFilterFor(search.q);

  const reset = () => {
    filter.reset();
    search.clearQuery();
  };

  return (
    <BoardLayout
      panel={
        <SearchFilterPanel>
          <SearchInputBar
            badge={
              search.q
                ? { label: `"${search.q}"`, icon: 'fa-regular fa-clock', clearTitle: searchText.clearQueryTitle, onClear: search.clearQuery }
                : undefined
            }
            placeholder={searchText.placeholder}
            value={search.draft}
            onChange={search.onDraftChange}
            onSubmit={search.onSubmit}
            resultCount={total}
            submitLabel={searchText.searchButton}
            onReset={reset}
          />
          <FilterChipsRow
            gameValue={searchText.gameFilterAll}
            timeValue={timeLabel ?? boardText.timeFilterAll}
            timeActive={timeLabel !== null}
            tagFilters={searchTagFilters}
            activeTags={filter.tags}
            onToggleTag={filter.toggleTag}
            excludeClosed={filter.excludeClosed}
            onExcludeClosedChange={filter.onExcludeClosedChange}
          />
        </SearchFilterPanel>
      }
      sidebar={<BoardCategorySidebar activeId="all" categories={categories} />}
    >
      <BoardToolbar summary={<SearchQuerySummary query={search.q} />} sort={filter.sort} onSortChange={filter.onSortChange} />
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'} aria-busy={loading}>
        <PostTable posts={posts} startNo={pg.startIndex + 1} highlight={search.q} />
      </div>
      <BoardFooterControls
        total={total}
        startIndex={pg.startIndex}
        endIndex={pg.endIndex}
        pagination={{
          page: pg.page,
          pages: pg.pages,
          hasPrev: pg.hasPrev,
          hasNext: pg.hasNext,
          onPrev: pg.prev,
          onNext: pg.next,
          onGoTo: pg.goTo,
        }}
      />
    </BoardLayout>
  );
};

export default SearchResultsPage;
