import React from 'react';
import { boardText } from '../../data/boardData';
import Pagination from './Pagination';
import WritePostButton from './WritePostButton';

interface BoardFooterControlsProps {
  readonly total: number;
  readonly startIndex: number;
  readonly endIndex: number;
  readonly pagination: React.ComponentProps<typeof Pagination>;
}

/** Range text + pagination + 글쓰기 CTA under the post table. */
export const BoardFooterControls: React.FC<BoardFooterControlsProps> = ({ total, startIndex, endIndex, pagination }) => (
  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
    <div className="hidden sm:block text-xs text-fog-muted">
      {boardText.totalPrefix}
      <span className="text-fog-headline font-semibold">{total}</span>
      {boardText.totalMiddle}
      {total === 0 ? 0 : `${startIndex + 1}-${endIndex}`}
      {boardText.totalSuffix}
    </div>
    <Pagination {...pagination} />
    <WritePostButton />
  </div>
);

export default BoardFooterControls;
