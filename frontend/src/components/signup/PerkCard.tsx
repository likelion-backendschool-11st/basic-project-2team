import React from 'react';
import type { PerkItem } from '../../data/signupData';

interface PerkCardProps {
  readonly perk: PerkItem;
}

const toneClass: Readonly<Record<PerkItem['tone'], string>> = {
  primary: 'bg-mercury/20 text-indigo-200',
  secondary: 'bg-blue-900/40 text-periwinkle',
};

export const PerkCard: React.FC<PerkCardProps> = ({ perk }) => (
  <div className="bg-night-base/90 rounded-2xl p-4 flex items-start gap-4 group hover:bg-night-card transition-colors">
    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${toneClass[perk.tone]}`}>
      <i className={`${perk.icon} text-[16px]`} />
    </div>
    <div className="flex flex-col min-w-0">
      <span className="text-sm font-medium text-fog-sub">{perk.eyebrow}</span>
      <span className="text-base font-semibold text-fog-headline truncate">{perk.title}</span>
      <span className="text-xs text-fog-muted mt-1">{perk.caption}</span>
    </div>
  </div>
);

export default PerkCard;
