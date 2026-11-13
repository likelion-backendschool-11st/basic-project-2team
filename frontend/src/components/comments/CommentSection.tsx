import React from 'react';
import { commentText, type CommentSort } from '../../data/commentData';
import type { useComments } from '../../hooks/useComments';
import Pagination from '../board/Pagination';
import CommentComposer from './CommentComposer';
import CommentItem from './CommentItem';

interface CommentSectionProps {
  readonly thread: ReturnType<typeof useComments>;
  readonly ownerView: boolean;
  readonly title?: string;
}

const sorts: readonly CommentSort[] = ['oldest', 'newest'];

/** Comment composer + sorted, paged thread with reply / edit / delete / report. */
export const CommentSection: React.FC<CommentSectionProps> = ({ thread: t, ownerView, title = commentText.title }) => (
  <section className="rounded-2xl border border-night-borderLight bg-night-surface p-6">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-bold text-white flex items-center gap-2"><i className="fa-regular fa-comment-dots text-mercury-light" />{title}<span className="text-[11px] px-1.5 rounded bg-mercury/20 text-indigo-200">{t.total}</span></h2>
      <div className="flex gap-1 text-xs">
        {sorts.map((s) => (
          <button key={s} type="button" aria-pressed={t.sort === s} onClick={() => t.setSort(s)} className={`px-3 py-1.5 rounded-lg ${t.sort === s ? 'bg-mercury/25 text-white font-bold' : 'text-fog-muted hover:text-white'}`}>{commentText.sort[s]}</button>
        ))}
      </div>
    </div>
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
