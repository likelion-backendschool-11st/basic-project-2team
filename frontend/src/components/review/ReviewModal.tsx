import React from 'react';
import { reviewDefaults, reviewMembers, reviewTags, reviewText } from '../../data/reviewData';
import type { ReviewMember, ReviewTag } from '../../data/reviewData';
import { useReviewForm, type SubmittedReview } from '../../hooks/useReviewForm';
import ReviewSheet from './ReviewSheet';
import ReviewConfirmDialog from './ReviewConfirmDialog';

interface ReviewModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly members?: readonly ReviewMember[];
  readonly tags?: readonly ReviewTag[];
  /** 시작 값. 생략하면 Stitch 시안 값(reviewDefaults)을 씁니다. */
  readonly initialValues?: { readonly rating: number; readonly text: string; readonly selectedTagIds: readonly string[] };
  /** Show the confirm panel immediately (reproduces the Stitch preview state). */
  readonly initialConfirmOpen?: boolean;
  /** 한 파티원 평가 저장. 실패하면 throw 해서 그 파티원에 머물게 합니다. */
  readonly onSubmitted?: (review: SubmittedReview) => void | Promise<void>;
  readonly errorMessage?: (err: unknown) => string;
  /** 마지막 파티원까지 평가를 마쳤을 때 (없으면 onClose) */
  readonly onComplete?: () => void;
}

type ReviewModalBodyProps = Omit<ReviewModalProps, 'isOpen'>;

/** Mounted only while open so form state resets on every open. */
const ReviewModalBody: React.FC<ReviewModalBodyProps> = ({
  onClose,
  members = reviewMembers,
  tags = reviewTags,
  initialValues = reviewDefaults,
  initialConfirmOpen = false,
  onSubmitted,
  errorMessage,
  onComplete = onClose,
}) => {
  const form = useReviewForm({
    members,
    tags,
    initialRating: initialValues.rating,
    maxRating: reviewDefaults.maxRating,
    initialText: initialValues.text,
    initialTagIds: initialValues.selectedTagIds,
    maxLength: reviewDefaults.maxLength,
    initialConfirmOpen,
    onSubmitted,
    errorMessage,
    onComplete,
  });

  if (!form.member) return null;
  const m = form.member;
  const max = form.stars.max;
  const close = () => {
    if (!form.submitting) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center justify-center gap-6 my-auto">
        {form.isConfirmOpen && (
          <ReviewConfirmDialog
            targetLabel={`${m.name} (${reviewText.levelPrefix}${m.level} ${m.role})`}
            ratingLabel={`${reviewText.star} ${form.stars.rating.toFixed(1)} / ${max.toFixed(1)}`}
            tagSummary={form.tagSummary}
            submitting={form.submitting}
            onCancel={form.cancelConfirm}
            onConfirm={() => void form.confirmSubmit()}
          />
        )}
        <ReviewSheet
          member={m}
          memberIndex={form.memberIndex}
          total={form.total}
          onPrevMember={form.prevMember}
          onNextMember={form.nextMember}
          maxRating={max}
          rating={form.stars.rating}
          displayRating={form.stars.displayRating}
          onSelectRating={form.stars.select}
          onHoverRating={form.stars.hover}
          onLeaveRating={form.stars.clearHover}
          text={form.text}
          textLength={form.textLength}
          maxLength={form.maxLength}
          onTextChange={form.onTextChange}
          tags={tags}
          selectedCount={form.selectedCount}
          isTagSelected={form.isTagSelected}
          onToggleTag={form.toggleTag}
          canSubmit={form.canSubmit}
          submitting={form.submitting}
          error={form.error}
          onSubmit={form.requestSubmit}
          onClose={close}
        />
      </div>
    </div>
  );
};

/**
 * Party-member rating & review modal. Control it with `useModal()`:
 *   const review = useModal(); <ReviewModal isOpen={review.isOpen} onClose={review.close} />
 */
export const ReviewModal: React.FC<ReviewModalProps> = ({ isOpen, ...rest }) => (isOpen ? <ReviewModalBody {...rest} /> : null);

export default ReviewModal;
