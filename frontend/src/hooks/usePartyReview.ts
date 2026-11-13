import { useRef, useState } from 'react';
import { errorMessageOf } from '../api/http';
import { getReviewTags, getReviewTargets, submitReviews, toReviewMember, toReviewTag } from '../api/reviewApi';
import { reviewText, type ReviewMember, type ReviewTag } from '../data/reviewData';
import type { SubmittedReview } from './useReviewForm';

interface PartyReviewSession {
  readonly postId: number;
  readonly members: readonly ReviewMember[];
  readonly tags: readonly ReviewTag[];
}

/**
 * 마이페이지 「별점 평가」 흐름 (docs/API_SPEC.md 7절).
 * open(postId) → 평가 대상·태그 조회 → 아직 평가하지 않은 파티원만 모달에 띄움 → 한 명씩 POST.
 * 모달이 닫히면(중간에 닫아도) onFinished 로 목록·프로필을 다시 불러오게 합니다.
 */
export function usePartyReview(notify: (message: string) => void, onFinished: () => void) {
  const [session, setSession] = useState<PartyReviewSession | null>(null);
  const [opening, setOpening] = useState(false);
  const tagsCache = useRef<readonly ReviewTag[] | null>(null);

  const open = async (postId: number) => {
    if (opening) return;
    setOpening(true);
    try {
      const [targets, tags] = await Promise.all([
        getReviewTargets(postId),
        tagsCache.current ? Promise.resolve(tagsCache.current) : getReviewTags().then((items) => items.map(toReviewTag)),
      ]);
      tagsCache.current = tags;
      const members = targets.filter((t) => !t.reviewed).map(toReviewMember);
      if (members.length === 0) {
        notify(reviewText.allReviewed);
        onFinished();
        return;
      }
      setSession({ postId, members, tags });
    } catch (err) {
      notify(errorMessageOf(err, reviewText.loadFailed));
    } finally {
      setOpening(false);
    }
  };

  /** 한 파티원 평가 저장. 실패하면 throw 해서 모달이 그 파티원에 머물게 합니다. */
  const submit = async (review: SubmittedReview) => {
    if (!session) return;
    await submitReviews(session.postId, [
      { targetMemberId: Number(review.memberId), rating: review.rating, tags: review.tagIds, comment: review.text.trim() },
    ]);
    const name = session.members.find((m) => m.id === review.memberId)?.name;
    if (name) notify(reviewText.submitted(name));
  };

  const close = () => {
    setSession(null);
    onFinished();
  };

  const complete = () => {
    close();
    notify(reviewText.finished);
  };

  return {
    isOpen: session !== null,
    members: session?.members ?? [],
    tags: session?.tags ?? [],
    open,
    opening,
    submit,
    close,
    complete,
    errorMessage: (err: unknown) => errorMessageOf(err, reviewText.submitFailed),
  };
}
