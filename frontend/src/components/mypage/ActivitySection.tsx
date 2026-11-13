import React from 'react';
import type { ActivityComment, ActivityPost, ActivityTab } from '../../data/myPageData';
import { activityText } from '../../data/myPageData';
import ActivityTabs from './ActivityTabs';
import ActivityPostRow from './ActivityPostRow';
import ActivityCommentRow from './ActivityCommentRow';
import ActivityPagination from './ActivityPagination';

interface ActivitySectionProps {
  readonly tab: ActivityTab;
  readonly isActive: (id: ActivityTab) => boolean;
  readonly onSelectTab: (id: ActivityTab) => void;
  readonly posts: readonly ActivityPost[];
  readonly comments: readonly ActivityComment[];
  readonly totalCount: number;
  readonly loading: boolean;
  readonly error: string | null;
  /** 별점 평가 창을 여는 중이면 버튼을 잠급니다. */
  readonly actionDisabled?: boolean;
  readonly onPostAction: (post: ActivityPost) => void;
  readonly pager: {
    readonly page: number;
    readonly pages: readonly number[];
    readonly hasPrev: boolean;
    readonly hasNext: boolean;
    readonly prev: () => void;
    readonly next: () => void;
    readonly goTo: (page: number) => void;
    readonly rangeLabel: string;
  };
}

/** 내 공고 | 참여한 파티 | 댓글 section with table + pagination. */
export const ActivitySection: React.FC<ActivitySectionProps> = ({
  tab,
  isActive,
  onSelectTab,
  posts,
  comments,
  totalCount,
  loading,
  error,
  actionDisabled,
  onPostAction,
  pager,
}) => {
  const isComments = tab === 'comments';
  const rows = isComments ? comments.length : posts.length;
  const notice = error ?? (rows === 0 ? (loading ? activityText.loading : activityText.empty[tab]) : null);
  const cols = activityText.columns;

  return (
    <div className="bg-night-surface border border-night-borderLight rounded-2xl p-6 shadow-sm flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-night-borderLight pb-4">
        <ActivityTabs tabs={activityText.tabs} isActive={isActive} onSelect={onSelectTab} />
        <div className="text-xs font-semibold text-slate-400 flex items-center gap-1">
          <i className="fa-solid fa-circle-info text-sm text-slate-500" />
          {activityText.hint}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span className="w-1.5 h-4 bg-mercury rounded-full" />
          {activityText.titles[tab]}
        </h3>
        <span className="text-xs text-slate-400">{activityText.countLabel[tab](totalCount)}</span>
      </div>

      <div
        className={`border border-night-borderLight rounded-xl overflow-hidden bg-night-card/40 transition-opacity ${
          loading && rows > 0 ? 'opacity-60' : ''
        }`}
      >
        <div className="grid grid-cols-12 px-4 py-3 bg-night-card text-xs font-semibold text-slate-400 border-b border-night-borderLight">
          <div className="col-span-1 text-center">{cols.no}</div>
          <div className="col-span-2">{cols.game}</div>
          {isComments ? (
            <>
              <div className="col-span-7">{cols.comment}</div>
              <div className="col-span-2 text-center">{cols.date}</div>
            </>
          ) : (
            <>
              <div className="col-span-5">{cols.title}</div>
              <div className="col-span-2 text-center">{cols.date}</div>
              <div className="col-span-2 text-right sm:text-center">{cols.status}</div>
            </>
          )}
        </div>
        {notice && <p className={`px-4 py-8 text-center text-sm ${error ? 'text-rose-400' : 'text-slate-500'}`}>{notice}</p>}
        {!error &&
          (isComments
            ? comments.map((c, i) => <ActivityCommentRow key={c.id} comment={c} isLast={i === comments.length - 1} />)
            : posts.map((p, i) => (
                <ActivityPostRow key={p.id} post={p} isLast={i === posts.length - 1} actionDisabled={actionDisabled} onAction={onPostAction} />
              )))}
      </div>

      <ActivityPagination
        rangeLabel={pager.rangeLabel}
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
