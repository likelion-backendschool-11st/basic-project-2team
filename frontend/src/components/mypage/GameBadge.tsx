import React from 'react';
import type { GameAccent } from '../../data/myPageData';
import { gameBadgeStyles } from './mypageStyles';

interface GameBadgeProps {
  readonly label: string;
  readonly accent: GameAccent;
}

export const GameBadge: React.FC<GameBadgeProps> = ({ label, accent }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${gameBadgeStyles[accent]}`}>{label}</span>
);

export default GameBadge;
