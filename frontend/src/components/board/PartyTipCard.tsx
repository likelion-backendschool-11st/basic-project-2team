import React from 'react';
import { boardText } from '../../data/boardData';

interface PartyTipCardProps {
  readonly title?: string;
  readonly body?: string;
}

export const PartyTipCard: React.FC<PartyTipCardProps> = ({ title = boardText.tipTitle, body = boardText.tipBody }) => (
  <div className="bg-gradient-to-br from-night-surface to-night-deep border border-night-border rounded-2xl p-4 text-xs space-y-2 text-fog-muted">
    <div className="flex items-center gap-1.5 text-white font-semibold">
      <i className="fa-regular fa-lightbulb text-amber-400" />
      <span>{title}</span>
    </div>
    <p className="leading-relaxed">{body}</p>
  </div>
);

export default PartyTipCard;
