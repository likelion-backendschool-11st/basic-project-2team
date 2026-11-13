import React from 'react';
import { confirmText, reviewText } from '../../data/reviewData';

interface ReviewConfirmDialogProps {
  readonly targetLabel: string;
  readonly ratingLabel: string;
  readonly tagSummary: string;
  readonly submitting?: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

/** ⑦⑧⑨ "리뷰를 등록 하시겠습니까?" confirmation panel. */
export const ReviewConfirmDialog: React.FC<ReviewConfirmDialogProps> = ({ targetLabel, ratingLabel, tagSummary, submitting = false, onCancel, onConfirm }) => (
  <section
    role="alertdialog"
    aria-labelledby="review-confirm-title"
    className="w-full lg:w-[360px] bg-night-surface/95 border-2 border-mercury/60 rounded-2xl p-6 shadow-2xl shadow-mercury/30 order-2 lg:order-1 relative"
  >
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xs font-bold uppercase tracking-wider text-amber-400">{confirmText.eyebrow}</span>
    </div>
    <h3 id="review-confirm-title" className="text-lg font-bold text-white mb-2 leading-snug">
      {confirmText.title}
    </h3>
    <p className="text-xs text-slate-400 leading-relaxed mb-6">
      {confirmText.descBefore}
      <span className="text-mercury-light font-medium">{confirmText.descHighlight}</span>
      {confirmText.descAfter}
    </p>
    <div className="bg-night-base/90 border border-night-borderLight rounded-lg p-3 mb-6 text-xs text-slate-300 space-y-1.5">
      <div className="flex justify-between">
        <span className="text-slate-400">{confirmText.targetLabel}</span>
        <span className="text-white font-semibold">{targetLabel}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-400">{confirmText.ratingLabel}</span>
        <span className="text-amber-400 font-bold">{ratingLabel}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-400">{confirmText.tagsLabel}</span>
        <span className="text-indigo-300">{tagSummary}</span>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="w-1/2 py-2.5 px-4 rounded-xl border border-white/20 bg-night-card text-slate-300 hover:text-white hover:bg-night-hover font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 flex items-center justify-center gap-1.5"
      >
        <span>{confirmText.cancel}</span>
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={submitting}
        className="w-1/2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-mercury to-indigo-600 hover:from-mercury-light hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-mercury/30 transition-all focus:outline-none focus:ring-2 focus:ring-mercury-light disabled:opacity-50 flex items-center justify-center gap-1.5"
      >
        <span>{submitting ? reviewText.submitting : confirmText.confirm}</span>
      </button>
    </div>
    <div className="hidden lg:flex absolute -right-5 top-1/2 -translate-y-1/2 z-20 items-center justify-center">
      <div className="w-8 h-8 rounded-full bg-mercury text-white flex items-center justify-center shadow-lg border border-mercury-light transform rotate-180 text-base">
        {confirmText.flowArrow}
      </div>
    </div>
  </section>
);

export default ReviewConfirmDialog;
