import React from 'react';
import type { ReviewMember } from '../../data/reviewData';
import { reviewText } from '../../data/reviewData';

interface MemberSwitcherProps {
  readonly member: ReviewMember;
  readonly index: number;
  readonly total: number;
  readonly onPrev: () => void;
  readonly onNext: () => void;
}

const arrowBtn =
  'w-8 h-8 rounded-lg bg-night-card hover:bg-night-hover text-slate-300 hover:text-white flex items-center justify-center border border-night-borderLight transition';

/** ⑤ Party member navigator with prev/next arrows. */
export const MemberSwitcher: React.FC<MemberSwitcherProps> = ({ member, index, total, onPrev, onNext }) => (
  <div className="bg-night-base border border-night-borderLight rounded-xl p-3 flex items-center justify-between relative">
    <button type="button" aria-label={reviewText.prevMember} className={arrowBtn} onClick={onPrev}>
      <i className="fa-solid fa-chevron-left text-xs" />
    </button>
    <div className="flex items-center gap-3 text-center">
      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-mercury to-indigo-500 p-0.5 flex items-center justify-center shadow-md">
        <div className="w-full h-full bg-night-base rounded-full flex items-center justify-center text-sm font-bold text-indigo-300">
          {member.name}
        </div>
      </div>
      <div className="text-left">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold px-1.5 bg-mercury/20 text-indigo-300 rounded border border-mercury/30">
            {index + 1} / {total}
            {reviewText.memberCounterSuffix}
          </span>
          <span className="text-sm font-bold text-white">{member.name}</span>
        </div>
        <div className="text-xs text-slate-400">
          {reviewText.levelPrefix}
          {member.level} {[member.game, member.className].filter(Boolean).join(' · ')} ({member.role})
        </div>
      </div>
    </div>
    <button type="button" aria-label={reviewText.nextMember} className={arrowBtn} onClick={onNext}>
      <i className="fa-solid fa-chevron-right text-xs" />
    </button>
  </div>
);

export default MemberSwitcher;
