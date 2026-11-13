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
  /**
   * 한 파티원 평가를 저장합니다. Promise 를 돌려주면 끝날 때까지 기다리고,
   * 실패(throw)하면 그 파티원에 머문 채 에러 문구(errorMessageOf 의 결과)를 보여줍니다.
   */
  readonly onSubmitted?: (review: SubmittedReview) => void | Promise<void>;
  /** 실패 시 보여줄 문구를 고릅니다. 없으면 Error.message */
  readonly errorMessage?: (err: unknown) => string;
  /** Called after the last member has been reviewed. */
  readonly onComplete?: () => void;
}

/**
 * 파티원 별점 평가 폼. 등록을 마친 파티원은 목록에서 빠지므로
 * 이전/다음으로 돌아가 같은 파티원을 다시 평가할 수 없습니다.
 */
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
  errorMessage = (err) => (err instanceof Error ? err.message : String(err)),
  onComplete,
}: UseReviewFormOptions) {
  const [doneIds, setDoneIds] = useState<readonly string[]>([]);
  const [memberIndex, setMemberIndex] = useState(0);
  const [text, setText] = useState(initialText.slice(0, maxLength));
  const [selectedTagIds, setSelectedTagIds] = useState<readonly string[]>(initialTagIds);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stars = useStarRating(initialRating, maxRating);
  const confirm = useModal(initialConfirmOpen, { closeOnEscape: false });

  const pending = useMemo(() => members.filter((m) => !doneIds.includes(m.id)), [members, doneIds]);
  const total = pending.length;
  const index = Math.min(memberIndex, Math.max(0, total - 1));
  const member = pending[index];

  const moveTo = (next: number) => {
    setMemberIndex(next);
    setError(null);
  };
  const prevMember = () => moveTo((index - 1 + total) % total);
  const nextMember = () => moveTo((index + 1) % total);

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

  const confirmSubmit = async () => {
    if (!member || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmitted?.({ memberId: member.id, rating: stars.rating, text, tagIds: selectedTagIds });
    } catch (err) {
      setError(errorMessage(err));
      confirm.close();
      return;
    } finally {
      setSubmitting(false);
    }
    confirm.close();
    if (total <= 1) {
      onComplete?.();
      return;
    }
    // 등록한 파티원이 빠지면 같은 index 가 다음 파티원을 가리킵니다.
    setDoneIds((prev) => [...prev, member.id]);
    resetForm();
  };

  return {
    member,
    memberIndex: index,
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
    canSubmit: stars.rating > 0 && !submitting,
    submitting,
    error,
    isConfirmOpen: confirm.isOpen,
    requestSubmit: confirm.open,
    cancelConfirm: confirm.close,
    confirmSubmit,
  };
}
