import { useState } from 'react';
import { errorMessageOf } from '../api/http';
import { changePostStatus, removeScrap } from '../api/postApi';
import { activityText, completeText, type ActivityPost } from '../data/myPageData';
import { useBlockedUsers } from './useBlockedUsers';
import { useFavoriteUsers } from './useFavoriteUsers';
import { useModal } from './useModal';
import { useMyActivity } from './useMyActivity';
import { useMyProfile } from './useMyProfile';
import { useNoShowReport } from './useNoShowReport';
import { usePartyInvite } from './usePartyInvite';
import { usePartyReview } from './usePartyReview';
import { useRecentPlayers } from './useRecentPlayers';
import { useToast } from './useToast';

/**
 * 마이페이지 전체 상태: 프로필 요약 · 활동 목록 · 즐겨찾기 · 최근 함께한 플레이어(파티 초대) · 활동 완료 처리 · 별점 평가(노쇼 신고 포함) · 스크랩 해제.
 * 활동 완료(PATCH /api/posts/{postId}/status COMPLETED)에 성공하면 바로 별점 평가 창을 엽니다.
 */
export function useMyPage() {
  const toast = useToast();
  const profile = useMyProfile();
  const activity = useMyActivity();
  const favorites = useFavoriteUsers(toast.show);
  const blocks = useBlockedUsers(toast.show);
  const recentPlayers = useRecentPlayers();
  const invite = usePartyInvite(toast.show);
  const refresh = () => {
    activity.reload();
    profile.reload();
  };
  const review = usePartyReview(toast.show, refresh);
  const noShowReport = useNoShowReport(review.postId, toast.show);

  const completeDialog = useModal(false);
  const [completeTarget, setCompleteTarget] = useState<ActivityPost | null>(null);
  const [completing, setCompleting] = useState(false);

  /** 목록의 「상태 / 조치」 버튼 */
  const onPostAction = (post: ActivityPost) => {
    if (post.action.kind === 'complete') {
      setCompleteTarget(post);
      completeDialog.open();
      return;
    }
    if (post.action.kind === 'review') void review.open(post.postId);
  };

  /** 스크랩 탭의 「스크랩 해제」 (DELETE /api/posts/{postId}/scrap) 후 목록을 다시 불러옵니다. */
  const [unscrapping, setUnscrapping] = useState(false);
  const onUnscrap = async (post: ActivityPost) => {
    if (unscrapping) return;
    setUnscrapping(true);
    try {
      await removeScrap(String(post.postId));
      toast.show(activityText.unscrapped);
    } catch (err) {
      toast.show(errorMessageOf(err, activityText.unscrapFailed));
    } finally {
      setUnscrapping(false);
      activity.reload();
    }
  };

  const cancelComplete = () => {
    if (completing) return;
    completeDialog.close();
    setCompleteTarget(null);
  };

  const confirmComplete = async () => {
    if (!completeTarget || completing) return;
    setCompleting(true);
    try {
      await changePostStatus(completeTarget.postId, 'COMPLETED');
      completeDialog.close();
      toast.show(completeText.done);
      refresh();
      void review.open(completeTarget.postId);
      setCompleteTarget(null);
    } catch (err) {
      completeDialog.close();
      setCompleteTarget(null);
      toast.show(errorMessageOf(err, completeText.failed));
      activity.reload();
    } finally {
      setCompleting(false);
    }
  };

  return {
    profile,
    activity,
    favorites,
    blocks,
    recentPlayers,
    invite,
    review,
    noShowReport,
    onPostAction,
    unscrap: { pending: unscrapping, run: (post: ActivityPost) => void onUnscrap(post) },
    complete: { isOpen: completeDialog.isOpen, completing, cancel: cancelComplete, confirm: () => void confirmComplete() },
    toast,
  };
}
