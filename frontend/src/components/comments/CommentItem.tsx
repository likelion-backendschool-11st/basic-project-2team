import React, { useState } from 'react';
import { commentText, type PostComment } from '../../data/commentData';
import type { CommentAuthorProfile } from '../../hooks/useComments';
import CommentComposer from './CommentComposer';
import UserPopover from './UserPopover';

interface CommentItemProps {
  readonly comment: PostComment;
  readonly replies: readonly PostComment[];
  readonly depth?: 0 | 1;
  readonly isReplying: boolean;
  readonly isEditing: boolean;
  readonly popoverOpen: boolean;
  readonly profile: CommentAuthorProfile;
  readonly ownerView: boolean;
  readonly onReply: () => void;
  readonly onSubmitReply: (text: string) => boolean | Promise<boolean>;
  readonly onCancelReply: () => void;
  readonly onEdit: () => void;
  readonly onSaveEdit: (text: string) => void;
  readonly onCancelEdit: () => void;
  readonly onDelete: () => void;
  readonly onReport: () => void;
  readonly onTogglePopover: () => void;
  readonly onPopoverAction: (message: string) => void;
  readonly renderReply: (reply: PostComment) => React.ReactNode;
}

const ago = (m: number) =>
  m <= 0 ? commentText.justNow : m < 60 ? `${m}분 전` : m < 60 * 24 ? `${Math.floor(m / 60)}시간 전` : `${Math.floor(m / (60 * 24))}일 전`;
const action = 'flex items-center gap-1 text-[11px] text-fog-muted hover:text-white transition-colors';

export const CommentItem: React.FC<CommentItemProps> = (p) => {
  const { comment: c, depth = 0 } = p;
  const { mine } = c;
  // 서버가 본문을 보내지 않은 비밀 댓글
  const hidden = c.locked;
  const [draft, setDraft] = useState(c.text);
  const [showHidden, setShowHidden] = useState(false);
  const collapsed = c.hidden && !showHidden;
  return (
    <div className={depth ? 'ml-8 mt-2 rounded-xl bg-night-base/70 p-3' : 'rounded-xl bg-night-base/50 p-4'}>
      <div className="flex items-center gap-2 text-xs">
        <button type="button" onClick={p.onTogglePopover} className="w-7 h-7 rounded-full bg-mercury/25 text-white text-[11px] font-bold hover:ring-2 hover:ring-mercury/50" aria-label={`${c.author} 프로필`}>{c.initial}</button>
        <span className="font-bold text-white">{c.author}</span>
        {c.badge === 'mine' && <span className="px-1.5 rounded bg-emeraldAccent/15 text-emerald-300 text-[10px]">{commentText.mine}</span>}
        {c.badge === 'author' && <span className="px-1.5 rounded bg-mercury/30 text-indigo-200 text-[10px]">{commentText.author}</span>}
        <span className="text-fog-muted">{ago(c.ageMin)}</span>
        {c.secret && <i className="fa-solid fa-lock text-[10px] text-amberAccent" />}
      </div>
      {p.popoverOpen && <UserPopover profile={p.profile} onAction={p.onPopoverAction} onClose={p.onTogglePopover} />}
      {p.isEditing ? (
        <div className="mt-2">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} className="w-full resize-none rounded-lg bg-night-surface border-0 p-3 text-sm text-fog-headline focus:ring-1 focus:ring-mercury" />
          <div className="flex justify-end gap-2 mt-2 text-xs">
            <button type="button" onClick={p.onCancelEdit} className="px-3 py-1.5 text-fog-sub hover:text-white">{commentText.cancel}</button>
            <button type="button" onClick={() => p.onSaveEdit(draft)} className="px-4 py-1.5 rounded-lg bg-mercury text-white font-bold"><i className="fa-solid fa-check mr-1" />{commentText.save}</button>
          </div>
        </div>
      ) : collapsed ? (
        <p className="mt-2 text-sm leading-6 text-fog-muted italic">
          {commentText.hiddenNotice}{' '}
          <button type="button" onClick={() => setShowHidden(true)} className="not-italic text-xs text-mercury-light hover:underline">{commentText.showHidden}</button>
        </p>
      ) : (
        <p className={`mt-2 text-sm leading-6 ${hidden ? 'text-fog-muted italic' : 'text-fog-headline'}`}>
          {hidden ? commentText.secretView : c.text} {c.edited && <span className="text-[10px] text-fog-muted">{commentText.edited}</span>}
        </p>
      )}
      {!p.isEditing && (
        <div className="mt-2 flex items-center gap-4">
          {depth === 0 && <button type="button" className={action} onClick={p.onReply}><i className="fa-solid fa-reply" />{commentText.reply}</button>}
          {mine ? (
            <>
              {!c.hidden && <button type="button" className={action} onClick={p.onEdit}><i className="fa-solid fa-pen" />{commentText.edit}</button>}
              <button type="button" className={action} onClick={p.onDelete}><i className="fa-regular fa-trash-can" />{commentText.remove}</button>
            </>
          ) : (
            <button type="button" disabled={c.reported} className={`${action} disabled:opacity-60 disabled:pointer-events-none ${c.reported ? 'text-rose-300' : ''}`} onClick={p.onReport}><i className="fa-regular fa-flag" />{c.reported ? commentText.reported : commentText.report}</button>
          )}
        </div>
      )}
      {p.isReplying && (
        <div className="mt-3 ml-6"><CommentComposer autoFocus placeholder={commentText.replyPlaceholder} submitLabel={commentText.submitReply} onSubmit={(t) => p.onSubmitReply(t)} onCancel={p.onCancelReply} /></div>
      )}
      {p.replies.map((r) => <React.Fragment key={r.id}>{p.renderReply(r)}</React.Fragment>)}
    </div>
  );
};

export default CommentItem;
