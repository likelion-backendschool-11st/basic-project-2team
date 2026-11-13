import { useCallback, useEffect, useMemo, useState } from 'react';
import { errorMessageOf } from '../api/http';
import {
  getMyApplications,
  getMyComments,
  getMyPosts,
  toActivityComment,
  toActivityPost,
  toPartyPost,
} from '../api/mypageApi';
import { activityText, type ActivityComment, type ActivityPost, type ActivityTab } from '../data/myPageData';

const PAGE_SIZE = activityText.pageSize;
const PAGE_WINDOW = 5;

interface ActivityResult {
  readonly tab: ActivityTab;
  readonly posts: readonly ActivityPost[];
  readonly comments: readonly ActivityComment[];
  readonly totalCount: number;
  readonly totalPages: number;
}

/** 탭별 한 페이지를 불러옵니다. 번호(no)는 전체 목록 기준 순번입니다. */
async function fetchActivity(tab: ActivityTab, page: number): Promise<ActivityResult> {
  const offset = (page - 1) * PAGE_SIZE;
  if (tab === 'comments') {
    const res = await getMyComments(page, PAGE_SIZE);
    return { tab, posts: [], comments: res.items.map((c, i) => toActivityComment(c, offset + i + 1)), totalCount: res.totalCount, totalPages: res.totalPages };
  }
  if (tab === 'parties') {
    const res = await getMyApplications('ACCEPTED', page, PAGE_SIZE);
    return { tab, posts: res.items.map((a, i) => toPartyPost(a, offset + i + 1)), comments: [], totalCount: res.totalCount, totalPages: res.totalPages };
  }
  const res = await getMyPosts(page, PAGE_SIZE);
  return { tab, posts: res.items.map((p, i) => toActivityPost(p, offset + i + 1)), comments: [], totalCount: res.totalCount, totalPages: res.totalPages };
}

/**
 * 마이페이지 활동 목록 (내 공고 · 참여한 파티 · 댓글). 서버 페이지네이션을 씁니다.
 * `reload()` 는 지금 탭·페이지를 다시 불러옵니다 (활동 완료·별점 평가 뒤 진행 상황 갱신).
 */
export function useMyActivity() {
  const [tab, setTab] = useState<ActivityTab>('posts');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ActivityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchActivity(tab, page)
      .then((next) => {
        if (cancelled) return;
        // 지운 항목 때문에 마지막 페이지가 사라졌으면 남은 마지막 페이지로 옮깁니다.
        if (next.totalPages > 0 && page > next.totalPages) {
          setPage(next.totalPages);
          return;
        }
        setResult(next);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessageOf(err, activityText.loadFailed));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, page, reloadKey]);

  const selectTab = (next: ActivityTab) => {
    if (next === tab) return;
    setTab(next);
    setPage(1);
    setResult(null);
  };

  // 다른 탭의 이전 결과는 보여주지 않습니다.
  const current = result?.tab === tab ? result : null;
  const totalCount = current?.totalCount ?? 0;
  const totalPages = Math.max(1, current?.totalPages ?? 1);

  const pages = useMemo(() => {
    const size = Math.min(PAGE_WINDOW, totalPages);
    const start = Math.min(Math.max(1, page - Math.floor(size / 2)), totalPages - size + 1);
    return Array.from({ length: size }, (_, i) => start + i);
  }, [page, totalPages]);

  const goTo = (p: number) => setPage(Math.min(Math.max(1, p), totalPages));
  const startIndex = (page - 1) * PAGE_SIZE;
  const visibleCount = (current?.posts.length ?? 0) + (current?.comments.length ?? 0);

  return {
    tab,
    selectTab,
    isActive: (id: ActivityTab) => id === tab,
    posts: current?.posts ?? [],
    comments: current?.comments ?? [],
    totalCount,
    loading,
    error,
    reload: useCallback(() => setReloadKey((k) => k + 1), []),
    pager: {
      page,
      pages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
      prev: () => goTo(page - 1),
      next: () => goTo(page + 1),
      goTo,
      rangeLabel: `${visibleCount === 0 ? 0 : startIndex + 1}-${startIndex + visibleCount} of ${totalCount}${activityText.rangeSuffix}`,
    },
  };
}
