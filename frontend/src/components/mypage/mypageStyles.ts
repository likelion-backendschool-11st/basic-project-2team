import type { AccountMenuItem, GameAccent } from '../../data/myPageData';

/** Static class maps so Tailwind's JIT sees every class. */
export const gameBadgeStyles: Record<GameAccent, string> = {
  amber: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  blue: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  rose: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
};

export const accountMenuStyles: Record<AccountMenuItem['variant'], { readonly button: string; readonly icon: string }> = {
  primary: {
    button: 'font-semibold bg-mercury text-white shadow-md shadow-mercury/20 hover:bg-mercury-dark',
    icon: '',
  },
  default: {
    button: 'font-medium text-slate-300 bg-night-card hover:bg-night-card/80 hover:text-white border border-night-borderLight',
    icon: 'text-slate-400',
  },
  danger: {
    button: 'font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30',
    icon: '',
  },
};

export const topTagStyles: Record<1 | 2 | 3, { readonly chip: string; readonly rank: string; readonly percent: string }> = {
  1: {
    chip: 'bg-mercury/15 text-mercury-light border-mercury/30',
    rank: 'text-mercury-light',
    percent: 'text-slate-300',
  },
  2: {
    chip: 'bg-night-hover/40 text-slate-200 border-night-borderLight',
    rank: 'text-amber-400',
    percent: 'text-slate-400',
  },
  3: {
    chip: 'bg-night-hover/40 text-slate-200 border-night-borderLight',
    rank: 'text-slate-400',
    percent: 'text-slate-400',
  },
};
