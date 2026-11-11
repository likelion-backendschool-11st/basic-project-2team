import React from 'react';
import type { PostStatus } from '../../data/myPageData';

interface PostStatusActionProps {
  readonly status: PostStatus;
  readonly label: string;
  readonly onAction?: () => void;
}

/** 상태 / 조치 cell: completed badge-button, closed label, or "활동 완료 처리" action. */
export const PostStatusAction: React.FC<PostStatusActionProps> = ({ status, label, onAction }) => {
  if (status === 'closed') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-night-hover/40 text-slate-400 border border-night-borderLight">
        {label}
      </span>
    );
  }
  if (status === 'completed') {
    return (
      <button
        type="button"
        onClick={onAction}
        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/25 transition-all shadow-sm"
      >
        <i className="fa-solid fa-check text-[11px] text-emerald-400" />
        {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onAction}
      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-mercury/20 text-mercury-light border border-mercury/50 hover:bg-mercury hover:text-white transition-all"
    >
      {label}
    </button>
  );
};

export default PostStatusAction;
