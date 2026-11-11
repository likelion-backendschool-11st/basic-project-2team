import React from 'react';
import { Link } from 'react-router-dom';
import type { ActivityComment } from '../../data/myPageData';
import GameBadge from './GameBadge';

interface ActivityCommentRowProps {
  readonly comment: ActivityComment;
  readonly isLast: boolean;
}

export const ActivityCommentRow: React.FC<ActivityCommentRowProps> = ({ comment, isLast }) => (
  <div
    className={`grid grid-cols-12 px-4 py-3.5 text-sm items-center hover:bg-night-surface/80 transition-colors ${
      isLast ? '' : 'border-b border-night-borderLight/60'
    }`}
  >
    <div className="col-span-1 text-center font-medium text-slate-400 text-xs">{comment.no}</div>
    <div className="col-span-2">
      <GameBadge label={comment.game} accent={comment.accent} />
    </div>
    <div className="col-span-7 pr-2 min-w-0">
      <Link to={comment.to} className="block font-medium text-slate-200 hover:text-mercury-light transition-colors truncate">
        {comment.content}
      </Link>
      <span className="block text-[11px] text-slate-500 truncate mt-0.5">{comment.postTitle}</span>
    </div>
    <div className="col-span-2 text-center text-xs text-slate-400 font-mono">{comment.date}</div>
  </div>
);

export default ActivityCommentRow;
