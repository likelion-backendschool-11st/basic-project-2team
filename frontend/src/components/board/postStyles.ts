import type { GameTone, MembersTone, PostBadgeTone } from '../../data/boardData';

/** Static class maps so Tailwind's JIT sees every class. */
export const gameToneStyles: Record<GameTone, string> = {
  indigo: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  rose: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  amberDeep: 'bg-amber-600/15 text-amber-400 border-amber-600/30',
  sky: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  yellow: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  orange: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
};

export const membersToneStyles: Record<MembersTone, string> = {
  open: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  few: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  urgent: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

export const postBadgeStyles: Record<PostBadgeTone, string> = {
  neutral: 'bg-night-base text-fog-muted border-night-border',
  rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30 font-semibold',
  brand: 'bg-mercury/15 text-indigo-200 border-mercury/30 font-semibold',
  brandSoft: 'bg-mercury/10 text-mercury-light border-mercury/20',
  urgent: 'bg-red-500/20 text-rose-300 border-rose-500/30 font-bold',
};
