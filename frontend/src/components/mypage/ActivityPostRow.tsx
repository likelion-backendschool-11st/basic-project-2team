import React from 'react';
import { Link } from 'react-router-dom';
import { activityText, type ActivityPost } from '../../data/myPageData';
import GameBadge from './GameBadge';
import PostStatusAction from './PostStatusAction';

interface ActivityPostRowProps {
  readonly post: ActivityPost;
  readonly isLast: boolean;
  readonly actionDisabled?: boolean;
  readonly onAction: (post: ActivityPost) => void;
  /** 스크랩 탭 행(`post.scrapped`)의 「스크랩 해제」 버튼 */
  readonly onUnscrap?: (post: ActivityPost) => void;
  readonly unscrapDisabled?: boolean;
}

export const ActivityPostRow: React.FC<ActivityPostRowProps> = ({ post, isLast, actionDisabled, onAction, onUnscrap, unscrapDisabled }) => (
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
      <Link to={post.to} className="font-medium text-slate-200 hover:text-mercury-light transition-colors">
        {post.title}{' '}
        <span className={`text-xs font-semibold ${post.full ? 'text-emerald-400' : 'text-amber-400'}`}>{post.members}</span>
      </Link>
    </div>
    <div className="col-span-2 text-center text-xs text-slate-400 font-mono">{post.date}</div>
    <div className="col-span-2 flex items-center justify-end sm:justify-center gap-1.5">
      <PostStatusAction action={post.action} disabled={actionDisabled} onAction={() => onAction(post)} />
      {post.scrapped && onUnscrap && (
        <button
          type="button"
          onClick={() => onUnscrap(post)}
          disabled={unscrapDisabled}
          title={activityText.unscrap}
          aria-label={activityText.unscrap}
          className="w-7 h-7 shrink-0 inline-flex items-center justify-center rounded-lg text-amber-400 hover:text-white hover:bg-rose-500/20 border border-night-borderLight transition-all disabled:opacity-50"
        >
          <i className="fa-solid fa-bookmark text-xs" />
        </button>
      )}
    </div>
  </div>
);

export default ActivityPostRow;
