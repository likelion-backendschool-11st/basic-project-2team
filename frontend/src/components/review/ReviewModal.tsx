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
  /** Show the confirm panel immediately (reproduces the Stitch preview state). */
  readonly initialConfirmOpen?: boolean;
  readonly onSubmitted?: (review: SubmittedReview) => void;
}

type ReviewModalBodyProps = Omit<ReviewModalProps, 'isOpen'>;

/** Mounted only while open so form state resets on every open. */
const ReviewModalBody: React.FC<ReviewModalBodyProps> = ({
  onClose,
  members = reviewMembers,
  tags = reviewTags,
  initialConfirmOpen = false,
  onSubmitted,
}) => {
  const form = useReviewForm({
    members,
    tags,
    initialRating: reviewDefaults.rating,
    maxRating: reviewDefaults.maxRating,
    initialText: reviewDefaults.text,
    initialTagIds: reviewDefaults.selectedTagIds,
    maxLength: reviewDefaults.maxLength,
    initialConfirmOpen,
    onSubmitted,
    onComplete: onClose,
  });

  if (!form.member) return null;
  const m = form.member;
  const max = form.stars.max;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center justify-center gap-6 my-auto">
        {form.isConfirmOpen && (
          <ReviewConfirmDialog
            targetLabel={`${m.name} (${reviewText.levelPrefix}${m.level} ${m.role})`}
            ratingLabel={`${reviewText.star} ${form.stars.rating.toFixed(1)} / ${max.toFixed(1)}`}
            tagSummary={form.tagSummary}
            onCancel={form.cancelConfirm}
            onConfirm={form.confirmSubmit}
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
          onSubmit={form.requestSubmit}
          onClose={onClose}
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
