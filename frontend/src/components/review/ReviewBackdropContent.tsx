import React from 'react';
import { reviewBackdrop } from '../../data/reviewData';

interface ReviewBackdropContentProps {
  /** Dim + blur the content (true while the modal is open). */
  readonly dimmed: boolean;
}

const toneStyles = {
  default: 'text-white',
  brand: 'text-mercury-light',
  warn: 'text-yellow-400',
} as const;

/** "내 파티 관리 및 완료 내역" view shown underneath the review modal. */
export const ReviewBackdropContent: React.FC<ReviewBackdropContentProps> = ({ dimmed }) => (
  <div
    aria-hidden={dimmed}
    className={`w-full max-w-7xl mx-auto px-6 py-8 transition ${dimmed ? 'pointer-events-none select-none opacity-20 blur-[1px]' : ''}`}
  >
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-white">{reviewBackdrop.title}</h1>
        <p className="text-slate-400 text-sm mt-1">{reviewBackdrop.description}</p>
      </div>
      <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold rounded-lg flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400" /> {reviewBackdrop.statusBadge}
      </div>
    </div>
    <div className="bg-night-surface border border-night-borderLight rounded-xl p-6 mb-6">
      <div className="flex items-center gap-3">
        <span className="px-2.5 py-1 text-xs font-semibold rounded bg-mercury/20 text-mercury-light border border-mercury/30">
          {reviewBackdrop.party.game}
        </span>
        <h2 className="text-lg font-bold text-white">{reviewBackdrop.party.title}</h2>
      </div>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-300">
        {reviewBackdrop.party.fields.map((f) => (
          <div key={f.id}>
            {f.label}
            <span className={`font-medium ${toneStyles[f.tone]}`}>{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default ReviewBackdropContent;
