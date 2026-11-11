import { useMemo, useState, type ChangeEvent } from 'react';
import type { ReviewMember, ReviewTag } from '../data/reviewData';
import { confirmText } from '../data/reviewData';
import { useStarRating } from './useStarRating';
import { useModal } from './useModal';

export interface SubmittedReview {
  readonly memberId: string;
  readonly rating: number;
  readonly text: string;
  readonly tagIds: readonly string[];
}

interface UseReviewFormOptions {
  readonly members: readonly ReviewMember[];
  readonly tags: readonly ReviewTag[];
  readonly initialRating: number;
  readonly maxRating: number;
  readonly initialText: string;
  readonly initialTagIds: readonly string[];
  readonly maxLength: number;
  /** Show the confirmation dialog immediately (design preview state). */
  readonly initialConfirmOpen?: boolean;
  readonly onSubmitted?: (review: SubmittedReview) => void;
  /** Called after the last member has been reviewed. */
  readonly onComplete?: () => void;
}

export function useReviewForm({
  members,
  tags,
  initialRating,
  maxRating,
  initialText,
  initialTagIds,
  maxLength,
  initialConfirmOpen = false,
  onSubmitted,
  onComplete,
}: UseReviewFormOptions) {
  const [memberIndex, setMemberIndex] = useState(0);
  const [text, setText] = useState(initialText.slice(0, maxLength));
  const [selectedTagIds, setSelectedTagIds] = useState<readonly string[]>(initialTagIds);
  const stars = useStarRating(initialRating, maxRating);
  const confirm = useModal(initialConfirmOpen, { closeOnEscape: false });

  const member = members[memberIndex];
  const total = members.length;

  const prevMember = () => setMemberIndex((i) => (i - 1 + total) % total);
  const nextMember = () => setMemberIndex((i) => (i + 1) % total);

  const onTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value.slice(0, maxLength));

  const isTagSelected = (id: string) => selectedTagIds.includes(id);
  const toggleTag = (id: string) =>
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));

  /** "#시간엄수, #친절함 외 3개" */
  const tagSummary = useMemo(() => {
    const labels = tags.filter((t) => selectedTagIds.includes(t.id)).map((t) => t.label);
    if (labels.length === 0) return confirmText.noTags;
    const head = labels.slice(0, 2).join(', ');
    const rest = labels.length - 2;
    return rest > 0 ? `${head}${confirmText.tagsMorePrefix}${rest}${confirmText.tagsMoreSuffix}` : head;
  }, [tags, selectedTagIds]);

  const resetForm = () => {
    stars.reset(0);
    setText('');
    setSelectedTagIds([]);
  };

  const confirmSubmit = () => {
    if (!member) return;
    onSubmitted?.({ memberId: member.id, rating: stars.rating, text, tagIds: selectedTagIds });
    confirm.close();
    if (memberIndex >= total - 1) {
      onComplete?.();
      return;
    }
    setMemberIndex((i) => i + 1);
    resetForm();
  };

  return {
    member,
    memberIndex,
    total,
    prevMember,
    nextMember,
    stars,
    text,
    textLength: text.length,
    maxLength,
    onTextChange,
    selectedCount: selectedTagIds.length,
    isTagSelected,
    toggleTag,
    tagSummary,
    canSubmit: stars.rating > 0,
    isConfirmOpen: confirm.isOpen,
    requestSubmit: confirm.open,
    cancelConfirm: confirm.close,
    confirmSubmit,
  };
}
