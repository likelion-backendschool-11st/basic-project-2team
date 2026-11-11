import React from 'react';
import type { GameOption } from '../../data/accountData';

interface GameCheckCardProps {
  readonly game: GameOption;
  readonly checked: boolean;
  readonly onToggle: (id: string) => void;
}

export const GameCheckCard: React.FC<GameCheckCardProps> = ({ game, checked, onToggle }) => (
  <button
    type="button"
    aria-pressed={checked}
    onClick={() => onToggle(game.id)}
    className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 text-left transition-all ${
      checked ? 'border-mercury bg-mercury/10' : 'border-night-borderLight bg-night-base hover:border-night-hover'
    }`}
  >
    <span className={`w-5 h-5 rounded flex items-center justify-center text-[11px] ${checked ? 'bg-mercury text-white' : 'border border-night-borderLight text-transparent'}`}>
      <i className="fa-solid fa-check" />
    </span>
    <span className="text-sm font-bold text-white">{game.name}</span>
    <span className="text-[10px] font-mono text-fog-muted border border-night-borderLight rounded px-1.5 py-0.5">{game.genre}</span>
  </button>
);

export default GameCheckCard;
