import React from 'react';
import BoardLayout from '../components/board/BoardLayout';
import SearchFilterPanel from '../components/board/SearchFilterPanel';
import SearchInputBar from '../components/board/SearchInputBar';
import FilterChipsRow from '../components/board/FilterChipsRow';
import BoardCategorySidebar from '../components/board/BoardCategorySidebar';
import BoardToolbar from '../components/board/BoardToolbar';
import PostTable from '../components/board/PostTable';
import BoardFooterControls from '../components/board/BoardFooterControls';
import { boardTagFilters, boardText } from '../data/boardData';
import { useBoardCategory } from '../hooks/useBoardCategory';
import { useBoardFilterState } from '../hooks/useBoardFilter';
import { useBoardList } from '../hooks/useBoardList';

interface BoardPageProps {
  readonly className?: string;
}

/** Stitch screen: "카테고리 게시판 (통합 레이아웃 유지형)" (1c52bc0b4b3c4c0ea50583ec66670d82). Route: /board?category= */
export const BoardPage: React.FC<BoardPageProps> = () => {
  const { category, categories, clearCategory } = useBoardCategory();
  const filter = useBoardFilterState();
  const { posts, total, loading, error, pagination: pg } = useBoardList(category.id, filter);

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
      sidebar={<BoardCategorySidebar activeId={category.id} categories={categories} />}
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
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'} aria-busy={loading}>
        <PostTable posts={posts} startNo={pg.startIndex + 1} />
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

export default BoardPage;
