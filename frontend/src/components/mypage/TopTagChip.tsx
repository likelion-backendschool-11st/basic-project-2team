import React from 'react';
import type { TopTag } from '../../data/myPageData';
import { topTagStyles } from './mypageStyles';

interface TopTagChipProps {
  readonly tag: TopTag;
  readonly rankSuffix: string;
}

export const TopTagChip: React.FC<TopTagChipProps> = ({ tag, rankSuffix }) => {
  const style = topTagStyles[tag.rank];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${style.chip}`}>
      <span className={`text-[10px] font-bold ${style.rank}`}>
        {tag.rank}
        {rankSuffix}
      </span>{' '}
      {tag.label} <span className={`text-[10px] font-semibold ${style.percent}`}>{tag.percent}</span>
    </span>
  );
};

export default TopTagChip;
