import React from 'react';
import type { ReviewMember, ReviewTag } from '../../data/reviewData';
import { reviewText } from '../../data/reviewData';
import MemberSwitcher from './MemberSwitcher';
import StarRating from './StarRating';
import ReviewTextArea from './ReviewTextArea';
import TagChecklist from './TagChecklist';

interface ReviewSheetProps {
  readonly member: ReviewMember;
  readonly memberIndex: number;
  readonly total: number;
  readonly onPrevMember: () => void;
  readonly onNextMember: () => void;
  readonly maxRating: number;
  readonly rating: number;
  readonly displayRating: number;
  readonly onSelectRating: (v: number) => void;
  readonly onHoverRating: (v: number) => void;
  readonly onLeaveRating: () => void;
  readonly text: string;
  readonly textLength: number;
  readonly maxLength: number;
  readonly onTextChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  readonly tags: readonly ReviewTag[];
  readonly selectedCount: number;
  readonly isTagSelected: (id: string) => boolean;
  readonly onToggleTag: (id: string) => void;
  readonly canSubmit: boolean;
  readonly submitting?: boolean;
  /** 등록 실패 문구 */
  readonly error?: string | null;
  readonly onSubmit: () => void;
  readonly onClose: () => void;
}

/** ①–⑥ Main party-member rating & review sheet. */
export const ReviewSheet: React.FC<ReviewSheetProps> = (p) => (
  <section
    role="dialog"
    aria-modal="true"
    aria-labelledby="review-sheet-title"
    className="w-full lg:w-[480px] bg-night-surface border border-night-borderLight rounded-2xl shadow-2xl flex flex-col overflow-hidden order-1 lg:order-2"
  >
    <div className="px-5 py-4 border-b border-night-borderLight/80 bg-night-card/80 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h2 id="review-sheet-title" className="text-base font-bold text-white tracking-wide">
          {reviewText.title}
        </h2>
        <span className="text-xs px-2 py-0.5 rounded-full bg-night-hover text-slate-300 border border-white/20 font-medium">
          {reviewText.subtitle}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <button type="button" className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1 rounded bg-night-hover border border-night-borderLight">
          {reviewText.help}
        </button>
        <button
          type="button"
          aria-label={reviewText.close}
          onClick={p.onClose}
          className="text-slate-400 hover:text-slate-200 text-xs w-6 h-6 rounded bg-night-hover border border-night-borderLight flex items-center justify-center"
        >
          <i className="fa-solid fa-xmark" />
        </button>
      </div>
    </div>
    <div className="p-5 overflow-y-auto max-h-[82vh] space-y-5">
      <MemberSwitcher member={p.member} index={p.memberIndex} total={p.total} onPrev={p.onPrevMember} onNext={p.onNextMember} />
      <StarRating
        max={p.maxRating}
        rating={p.rating}
        displayRating={p.displayRating}
        onSelect={p.onSelectRating}
        onHover={p.onHoverRating}
        onLeave={p.onLeaveRating}
      />
      <ReviewTextArea id="review-content" value={p.text} length={p.textLength} maxLength={p.maxLength} onChange={p.onTextChange} />
      <TagChecklist tags={p.tags} selectedCount={p.selectedCount} isSelected={p.isTagSelected} onToggle={p.onToggleTag} />
      <div className="pt-2">
        {p.error && (
          <p role="alert" className="mb-2 text-center text-xs font-medium text-rose-400">
            {p.error}
          </p>
        )}
        <button
          type="button"
          disabled={!p.canSubmit}
          onClick={p.onSubmit}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-mercury via-indigo-600 to-mercury-dark hover:from-mercury-light hover:to-indigo-500 text-white font-bold text-base shadow-lg shadow-mercury/30 transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 border border-mercury-light/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{p.submitting ? reviewText.submitting : reviewText.submit}</span>
        </button>
        <p className="text-center text-[11px] text-slate-500 mt-2">{reviewText.submitNote}</p>
      </div>
    </div>
  </section>
);

export default ReviewSheet;
