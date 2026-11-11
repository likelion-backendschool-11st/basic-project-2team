import React from 'react';
import { checkboxClass } from '../signup/fieldStyles';

interface AgreementCheckProps {
  readonly title: string;
  readonly note: string;
  readonly checked: boolean;
  readonly onToggle: () => void;
}

export const AgreementCheck: React.FC<AgreementCheckProps> = ({ title, note, checked, onToggle }) => (
  <label className="flex items-start gap-3 px-5 py-4 cursor-pointer">
    <input type="checkbox" className={`${checkboxClass} mt-1`} checked={checked} onChange={onToggle} />
    <span>
      <span className="block text-sm font-semibold text-white">{title}</span>
      <span className="block text-xs text-fog-muted mt-0.5">{note}</span>
    </span>
  </label>
);

export default AgreementCheck;
