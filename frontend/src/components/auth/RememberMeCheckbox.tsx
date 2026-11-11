import React, { type ChangeEvent } from 'react';

interface RememberMeCheckboxProps {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export const RememberMeCheckbox: React.FC<RememberMeCheckboxProps> = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 cursor-pointer select-none group">
    <span className="relative flex items-center">
      <input checked={checked} className="peer sr-only" id="remember-me" onChange={onChange} type="checkbox" />
      <span className="w-4 h-4 rounded bg-night-deep border border-night-borderLight peer-checked:bg-mercury peer-checked:border-mercury peer-focus-visible:ring-2 peer-focus-visible:ring-mercury/50 flex items-center justify-center transition-colors">
        {checked && <i className="fa-solid fa-check text-[10px] text-white" />}
      </span>
    </span>
    <span className="text-sm text-fog-sub group-hover:text-fog-headline transition-colors">{label}</span>
  </label>
);

export default RememberMeCheckbox;
