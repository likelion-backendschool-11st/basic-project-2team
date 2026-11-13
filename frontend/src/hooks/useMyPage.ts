import { useState } from 'react';
import { errorMessageOf } from '../api/http';
import { changePostStatus } from '../api/postApi';
import { completeText, type ActivityPost } from '../data/myPageData';
import { useFavoriteUsers } from './useFavoriteUsers';
import { useModal } from './useModal';
import { useMyActivity } from './useMyActivity';
import { useMyProfile } from './useMyProfile';
import { usePartyReview } from './usePartyReview';
import { useToast } from './useToast';

/**
 * 마이페이지 전체 상태: 프로필 요약 · 활동 목록 · 즐겨찾기 · 활동 완료 처리 · 별점 평가.
 * 활동 완료(PATCH /api/posts/{postId}/status COMPLETED)에 성공하면 바로 별점 평가 창을 엽니다.
 */
export function useMyPage() {
  const toast = useToast();
  const profile = useMyProfile();
  const activity = useMyActivity();
  const favorites = useFavoriteUsers(toast.show);
  const refresh = () => {
    activity.reload();
    profile.reload();
  };
  const review = usePartyReview(toast.show, refresh);

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
    review,
    onPostAction,
    complete: { isOpen: completeDialog.isOpen, completing, cancel: cancelComplete, confirm: () => void confirmComplete() },
    toast,
  };
}
