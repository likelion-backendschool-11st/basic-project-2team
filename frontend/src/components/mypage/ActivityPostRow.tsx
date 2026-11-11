import React from 'react';
import { Link } from 'react-router-dom';
import type { ActivityPost } from '../../data/myPageData';
import { activityText } from '../../data/myPageData';
import GameBadge from './GameBadge';
import PostStatusAction from './PostStatusAction';

interface ActivityPostRowProps {
  readonly post: ActivityPost;
  readonly isLast: boolean;
  readonly onComplete: (id: string) => void;
}

export const ActivityPostRow: React.FC<ActivityPostRowProps> = ({ post, isLast, onComplete }) => (
  <div
    className={`grid grid-cols-12 px-4 py-3.5 text-sm items-center hover:bg-night-surface/80 transition-colors ${
      isLast ? '' : 'border-b border-night-borderLight/60'
    }`}
  >
    <div className="col-span-1 text-center font-medium text-slate-400 text-xs">{post.no}</div>
    <div className="col-span-2">
      <GameBadge label={post.game} accent={post.accent} />
    </div>
    <div className="col-span-5 pr-2 truncate">
      <Link to={post.to} className={`font-medium hover:text-mercury-light transition-colors ${post.no === 1 ? 'text-slate-100' : 'text-slate-200'}`}>
        {post.title}{' '}
        <span className={`text-xs font-semibold ${post.full ? 'text-emerald-400' : 'text-amber-400'}`}>{post.members}</span>
      </Link>
    </div>
    <div className="col-span-2 text-center text-xs text-slate-400 font-mono">{post.date}</div>
    <div className="col-span-2 flex justify-end sm:justify-center">
      <PostStatusAction status={post.status} label={activityText.status[post.status]} onAction={() => onComplete(post.id)} />
    </div>
  </div>
);

export default ActivityPostRow;
