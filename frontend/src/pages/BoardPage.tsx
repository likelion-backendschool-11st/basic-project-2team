import React from 'react';
import BoardLayout from '../components/board/BoardLayout';
import SearchFilterPanel from '../components/board/SearchFilterPanel';
import SearchInputBar from '../components/board/SearchInputBar';
import FilterChipsRow from '../components/board/FilterChipsRow';
import BoardCategorySidebar from '../components/board/BoardCategorySidebar';
import BoardToolbar from '../components/board/BoardToolbar';
import PostTable from '../components/board/PostTable';
import BoardFooterControls from '../components/board/BoardFooterControls';
import { BOARD_PAGE_SIZE, boardTagFilters, boardText } from '../data/boardData';
import { useBoardCategory } from '../hooks/useBoardCategory';
import { useBoardFilter } from '../hooks/useBoardFilter';
import { usePagination } from '../hooks/usePagination';

interface BoardPageProps {
  readonly className?: string;
}

/** Stitch screen: "카테고리 게시판 (통합 레이아웃 유지형)" (1c52bc0b4b3c4c0ea50583ec66670d82). Route: /board?category= */
export const BoardPage: React.FC<BoardPageProps> = () => {
  const { category, posts, clearCategory } = useBoardCategory();
  const filter = useBoardFilter(posts);
  const pg = usePagination(filter.filtered.length, BOARD_PAGE_SIZE, `${category.id}|${filter.filterKey}`);
  const pageItems = filter.filtered.slice(pg.startIndex, pg.endIndex);
  const total = filter.filtered.length;

  return (
    <BoardLayout
      panel={
        <SearchFilterPanel>
          <SearchInputBar
            badge={
              category.id === 'all'
                ? undefined
                : { label: category.label, icon: category.icon, clearTitle: boardText.clearCategoryTitle, onClear: clearCategory }
            }
            placeholder={boardText.categoryPlaceholder(category.label)}
            value={filter.text}
            onChange={filter.onTextChange}
            onSubmit={filter.onSubmit}
            resultCount={total}
            submitLabel={boardText.searchButton}
            onReset={filter.reset}
          />
          <FilterChipsRow
            gameValue={boardText.gameFilterAll(category.label)}
            timeValue={boardText.timeFilterAll}
            tagFilters={boardTagFilters}
            activeTags={filter.tags}
            onToggleTag={filter.toggleTag}
            excludeClosed={filter.excludeClosed}
            onExcludeClosedChange={filter.onExcludeClosedChange}
          />
        </SearchFilterPanel>
      }
      sidebar={<BoardCategorySidebar activeId={category.id} />}
    >
      <BoardToolbar
        summary={
          <>
            {boardText.categoryCountLabel(category.label)}
            <strong className="text-white">{total}</strong>
            {boardText.categoryCountSuffix}
          </>
        }
        sort={filter.sort}
        onSortChange={filter.onSortChange}
      />
      <PostTable posts={pageItems} startNo={pg.startIndex + 1} />
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

export default BoardPage;
