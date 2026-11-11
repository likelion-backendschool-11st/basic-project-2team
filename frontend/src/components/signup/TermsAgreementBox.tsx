import React from 'react';
import type { TermItem } from '../../data/signupData';
import TermsRow from './TermsRow';
import { checkboxClass } from './fieldStyles';

interface TermsAgreementBoxProps {
  readonly title: string;
  readonly agreeAllLabel: string;
  readonly requiredLabel: string;
  readonly optionalLabel: string;
  readonly viewLabel: string;
  readonly terms: readonly TermItem[];
  readonly agreed: Readonly<Record<string, boolean>>;
  readonly allAgreed: boolean;
  readonly onToggle: (id: string) => void;
  readonly onToggleAll: () => void;
}

export const TermsAgreementBox: React.FC<TermsAgreementBoxProps> = ({
  title,
  agreeAllLabel,
  requiredLabel,
  optionalLabel,
  viewLabel,
  terms,
  agreed,
  allAgreed,
  onToggle,
  onToggleAll,
}) => (
  <div className="w-full bg-night-surface rounded-3xl p-6 flex flex-col gap-4 shadow-md">
    <div className="flex items-center justify-between pb-2">
      <span className="text-base font-semibold text-fog-headline flex items-center gap-2">
        <i className="fa-solid fa-shield-halved text-[16px] text-indigo-200" />
        {title}
      </span>
      <label className="flex items-center gap-1 cursor-pointer select-none group">
        <input className={checkboxClass} type="checkbox" checked={allAgreed} onChange={onToggleAll} />
        <span className="text-sm font-medium text-fog-headline group-hover:text-indigo-200 transition-colors">{agreeAllLabel}</span>
      </label>
    </div>
    <div className="w-full h-px bg-night-base" />
    <div className="flex flex-col gap-2">
      {terms.map((term) => (
        <TermsRow
          key={term.id}
          term={term}
          checked={Boolean(agreed[term.id])}
          onToggle={() => onToggle(term.id)}
          requiredLabel={requiredLabel}
          optionalLabel={optionalLabel}
          viewLabel={viewLabel}
        />
      ))}
    </div>
  </div>
);

export default TermsAgreementBox;
