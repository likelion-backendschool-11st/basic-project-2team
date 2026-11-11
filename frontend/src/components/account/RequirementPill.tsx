import React from 'react';

interface RequirementPillProps {
  readonly met: boolean;
  readonly label: string;
}

export const RequirementPill: React.FC<RequirementPillProps> = ({ met, label }) => (
  <span
    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs ${
      met ? 'border-emeraldAccent/40 bg-emeraldAccent/10 text-emerald-300' : 'border-night-borderLight text-fog-sub'
    }`}
  >
    <i className={met ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'} />
    {label}
  </span>
);

export default RequirementPill;
