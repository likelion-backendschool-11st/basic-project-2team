import React from 'react';
import type { ActivityComment, ActivityPost, ActivityTab } from '../../data/myPageData';
import { activityText } from '../../data/myPageData';
import { useTabs } from '../../hooks/useTabs';
import { usePagination } from '../../hooks/usePagination';
import ActivityTabs from './ActivityTabs';
import ActivityPostRow from './ActivityPostRow';
import ActivityCommentRow from './ActivityCommentRow';
import ActivityPagination from './ActivityPagination';

interface ActivitySectionProps {
  readonly posts: readonly ActivityPost[];
  readonly comments: readonly ActivityComment[];
  readonly onCompletePost: (id: string) => void;
}

/** 게시글 | 댓글 section with table + pagination. */
export const ActivitySection: React.FC<ActivitySectionProps> = ({ posts, comments, onCompletePost }) => {
  const { activeTab, selectTab, isActive } = useTabs<ActivityTab>('posts');
  const isPosts = activeTab === 'posts';
  const itemCount = isPosts ? posts.length : comments.length;
  const pager = usePagination(itemCount, activityText.pageSize, activeTab, 5);
  const visiblePosts = posts.slice(pager.startIndex, pager.endIndex);
  const visibleComments = comments.slice(pager.startIndex, pager.endIndex);
  const total = isPosts ? activityText.totalPosts : comments.length;
  const rangeLabel = `${itemCount === 0 ? 0 : pager.startIndex + 1}-${pager.endIndex} of ${total}${activityText.rangeSuffix}`;
  const cols = activityText.columns;

  return (
    <div className="bg-night-surface border border-night-borderLight rounded-2xl p-6 shadow-sm flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-night-borderLight pb-4">
        <ActivityTabs tabs={activityText.tabs} isActive={isActive} onSelect={selectTab} />
        <div className="text-xs font-semibold text-slate-400 flex items-center gap-1">
          <i className="fa-solid fa-circle-info text-sm text-slate-500" />
          {activityText.hint}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span className="w-1.5 h-4 bg-mercury rounded-full" />
          {isPosts ? activityText.postsTitle : activityText.commentsTitle}
        </h3>
        <span className="text-xs text-slate-400">{isPosts ? activityText.postsCount : activityText.commentsCount}</span>
      </div>

      <div className="border border-night-borderLight rounded-xl overflow-hidden bg-night-card/40">
        <div className="grid grid-cols-12 px-4 py-3 bg-night-card text-xs font-semibold text-slate-400 border-b border-night-borderLight">
          <div className="col-span-1 text-center">{cols.no}</div>
          <div className="col-span-2">{cols.game}</div>
          {isPosts ? (
            <>
              <div className="col-span-5">{cols.title}</div>
              <div className="col-span-2 text-center">{cols.date}</div>
              <div className="col-span-2 text-right sm:text-center">{cols.status}</div>
            </>
          ) : (
            <>
              <div className="col-span-7">{cols.comment}</div>
              <div className="col-span-2 text-center">{cols.date}</div>
            </>
          )}
        </div>
        {isPosts
          ? visiblePosts.map((p, i) => (
              <ActivityPostRow key={p.id} post={p} isLast={i === visiblePosts.length - 1} onComplete={onCompletePost} />
            ))
          : visibleComments.map((c, i) => <ActivityCommentRow key={c.id} comment={c} isLast={i === visibleComments.length - 1} />)}
      </div>

      <ActivityPagination
        rangeLabel={rangeLabel}
        pages={pager.pages}
        current={pager.page}
        hasPrev={pager.hasPrev}
        hasNext={pager.hasNext}
        prevLabel={activityText.prevLabel}
        nextLabel={activityText.nextLabel}
        onPrev={pager.prev}
        onNext={pager.next}
        onSelect={pager.goTo}
      />
    </div>
  );
};

export default ActivitySection;
