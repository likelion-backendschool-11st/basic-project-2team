import React from 'react';

interface RequirementBadgeProps {
  readonly required: boolean;
  readonly label: string;
}

export const RequirementBadge: React.FC<RequirementBadgeProps> = ({ required, label }) => (
  <span
    className={
      required
        ? 'px-1.5 py-0.5 text-[11px] font-bold rounded-full bg-roseAccent/20 text-rose-300 leading-none'
        : 'px-1.5 py-0.5 text-[11px] font-medium rounded-full bg-night-card text-fog-sub leading-none'
    }
  >
    {label}
  </span>
);

export default RequirementBadge;
