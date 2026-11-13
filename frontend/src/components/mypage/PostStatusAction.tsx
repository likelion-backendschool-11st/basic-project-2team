import React from 'react';
import type { ActivityAction } from '../../data/myPageData';

interface PostStatusActionProps {
  readonly action: ActivityAction;
  readonly disabled?: boolean;
  readonly onAction?: () => void;
}

/** 상태 / 조치 칸: 「활동 완료 처리」 버튼, 「별점 평가」 버튼, 또는 상태 라벨. */
export const PostStatusAction: React.FC<PostStatusActionProps> = ({ action, disabled = false, onAction }) => {
  if (action.kind === 'label') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-night-hover/40 text-slate-400 border border-night-borderLight">
        {action.label}
      </span>
    );
  }
  if (action.kind === 'review') {
    return (
      <button
        type="button"
        onClick={onAction}
        disabled={disabled}
        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/25 transition-all shadow-sm disabled:opacity-50"
      >
        <i className="fa-solid fa-star text-[11px] text-emerald-400" />
        {action.label}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onAction}
      disabled={disabled}
      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-mercury/20 text-mercury-light border border-mercury/50 hover:bg-mercury hover:text-white transition-all disabled:opacity-50"
    >
      {action.label}
    </button>
  );
};

export default PostStatusAction;
