import React from 'react';
import { COMMENTS_ANCHOR_ID, commentText, type CommentSort } from '../../data/commentData';
import { pollText } from '../../data/pollData';
import type { useComments } from '../../hooks/useComments';
import Pagination from '../board/Pagination';
import CommentComposer from './CommentComposer';
import CommentItem from './CommentItem';

interface CommentSectionProps {
  readonly thread: ReturnType<typeof useComments>;
  readonly ownerView: boolean;
  readonly title?: string;
  /** 공대장에게만: 「투표하기」 버튼 → 파티 의견 조율 투표 생성 */
  readonly onCreatePoll?: () => void;
  /** 상단에 고정하지 않은 투표 위젯 (작성창 위에 표시) */
  readonly poll?: React.ReactNode;
}

const sorts: readonly CommentSort[] = ['oldest', 'newest'];

/** Comment composer + sorted, paged thread with reply / edit / delete / report. */
export const CommentSection: React.FC<CommentSectionProps> = ({ thread: t, ownerView, title = commentText.title, onCreatePoll, poll }) => (
  <section id={COMMENTS_ANCHOR_ID} className="scroll-mt-24 rounded-2xl border border-night-borderLight bg-night-surface p-6">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-bold text-white flex items-center gap-2"><i className="fa-regular fa-comment-dots text-mercury-light" />{title}<span className="text-[11px] px-1.5 rounded bg-mercury/20 text-indigo-200">{t.total}</span></h2>
      <div className="flex items-center gap-2">
        {onCreatePoll && (
          <button type="button" onClick={onCreatePoll} className="inline-flex items-center gap-1.5 rounded-xl border border-mercury/40 bg-mercury/15 px-3 py-1.5 text-xs font-bold text-indigo-200 shadow-sm hover:border-mercury hover:bg-mercury/25 hover:text-white active:scale-95">
            <i className="fa-solid fa-check-to-slot text-mercury-light" />{pollText.open}
          </button>
        )}
        <div className="flex gap-1 text-xs">
          {sorts.map((s) => (
            <button key={s} type="button" aria-pressed={t.sort === s} onClick={() => t.setSort(s)} className={`px-3 py-1.5 rounded-lg ${t.sort === s ? 'bg-mercury/25 text-white font-bold' : 'text-fog-muted hover:text-white'}`}>{commentText.sort[s]}</button>
          ))}
        </div>
      </div>
    </div>
    {poll && <div className="mb-4">{poll}</div>}
    <CommentComposer allowSecret={!ownerView} placeholder={ownerView ? '공대원들에게 안내할 공지사항이나 답변을 남겨보세요...' : commentText.placeholder} submitLabel={commentText.submit} onSubmit={(text, secret) => t.add(text, { secret })} />
    <div className="mt-5 flex flex-col gap-3">
      {t.error && <p className="py-8 text-center text-sm text-rose-300">{t.error}</p>}
      {!t.error && t.loading && t.visible.length === 0 && <p className="py-8 text-center text-sm text-fog-muted">{commentText.loading}</p>}
      {!t.error && !t.loading && t.visible.length === 0 && <p className="py-8 text-center text-sm text-fog-muted">{commentText.empty}</p>}
      {t.visible.map((c) => {
        const row = (item: typeof c, depth: 0 | 1, replies: readonly typeof c[], render: (r: typeof c) => React.ReactNode) => (
          <CommentItem
            comment={item}
            replies={replies}
            depth={depth}
            ownerView={ownerView}
            isReplying={t.replyTo === item.id}
            isEditing={t.editing === item.id}
            popoverOpen={t.popoverFor === item.id}
            profile={t.profileOf(item.authorId)}
            onReply={() => t.setReplyTo(t.replyTo === item.id ? null : item.id)}
            onSubmitReply={(text) => t.add(text, { parentId: item.id })}
            onCancelReply={() => t.setReplyTo(null)}
            onEdit={() => t.setEditing(item.id)}
            onSaveEdit={(text) => t.saveEdit(item.id, text)}
            onCancelEdit={() => t.setEditing(null)}
            onDelete={() => t.askDelete(item.id)}
            onReport={() => t.askReport(item.id)}
            // 답글 채택은 그 답글이 달린 댓글(c)의 작성자만 — 본인 답글·비밀·가려진 답글은 서버도 거절합니다.
            canAccept={depth === 1 && c.mine && !item.mine && !item.secret && !item.hidden}
            onAccept={() => t.accept(item.id)}
            onCancelAccept={() => t.cancelAccept(item.id)}
            onTogglePopover={() => t.setPopoverFor(t.popoverFor === item.id ? null : item.id)}
            onPopoverAction={t.toast.show}
            renderReply={render}
          />
        );
        return <React.Fragment key={c.id}>{row(c, 0, t.repliesOf(c.id), (r) => row(r, 1, [], () => null))}</React.Fragment>;
      })}
    </div>
    <div className="mt-5 flex justify-end">
      <Pagination page={t.paging.page} pages={t.paging.pages} hasPrev={t.paging.hasPrev} hasNext={t.paging.hasNext} onPrev={t.paging.prev} onNext={t.paging.next} onGoTo={t.paging.goTo} />
    </div>
  </section>
);

export default CommentSection;
