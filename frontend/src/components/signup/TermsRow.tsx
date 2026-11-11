import React from 'react';
import type { TermItem } from '../../data/signupData';
import RequirementBadge from './RequirementBadge';
import { checkboxClass } from './fieldStyles';

interface TermsRowProps {
  readonly term: TermItem;
  readonly checked: boolean;
  readonly onToggle: () => void;
  readonly requiredLabel: string;
  readonly optionalLabel: string;
  readonly viewLabel: string;
}

export const TermsRow: React.FC<TermsRowProps> = ({ term, checked, onToggle, requiredLabel, optionalLabel, viewLabel }) => (
  <div className="flex items-center justify-between py-0.5">
    <label className="flex items-center gap-1 cursor-pointer select-none">
      <input className={checkboxClass} type="checkbox" checked={checked} onChange={onToggle} />
      <RequirementBadge required={term.required} label={term.required ? requiredLabel : optionalLabel} />
      <span className="text-sm text-fog-sub hover:text-fog-headline">{term.label}</span>
    </label>
    {term.note ? (
      <span className="text-fog-muted text-xs">{term.note}</span>
    ) : (
      <button className="text-xs text-fog-muted hover:text-indigo-200 underline underline-offset-2 transition-colors" type="button">
        {viewLabel}
      </button>
    )}
  </div>
);

export default TermsRow;
