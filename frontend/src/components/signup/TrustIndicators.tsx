import React from 'react';
import type { TrustIndicator } from '../../data/signupData';

interface TrustIndicatorsProps {
  readonly items: readonly TrustIndicator[];
}

export const TrustIndicators: React.FC<TrustIndicatorsProps> = ({ items }) => (
  <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-fog-muted text-xs">
    {items.map((item) => (
      <div key={item.label} className="flex items-center gap-1.5">
        <i className={`${item.icon} text-[14px] text-periwinkle`} />
        <span>{item.label}</span>
      </div>
    ))}
  </div>
);

export default TrustIndicators;
