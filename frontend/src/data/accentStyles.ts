import type { Accent } from './homeData';

/** Static class maps so Tailwind's JIT can see every class. */
export const tagStyles: Record<Accent, string> = {
  mercury: 'bg-mercury/20 text-mercury-light',
  amber: 'bg-amberAccent/20 text-amberAccent',
  sky: 'bg-sky-500/20 text-sky-400',
  purple: 'bg-purple-500/20 text-purple-300',
  blue: 'bg-blue-500/20 text-blue-300',
  emerald: 'bg-emerald-500/20 text-emerald-300',
  indigo: 'bg-indigo-500/20 text-indigo-300',
  rose: 'bg-roseAccent/20 text-roseAccent',
};

export const avatarStyles: Record<Accent, string> = {
  mercury: 'bg-indigo-600/40 border-mercury',
  amber: 'bg-amber-500/20 border-amber-400/40',
  sky: 'bg-sky-500/20 border-sky-500/30 text-sky-400',
  purple: 'bg-purple-600/30 border-purple-400/40',
  blue: 'bg-blue-600/30 border-blue-400/40',
  emerald: 'bg-emerald-500/20 border-emerald-500/30 text-emeraldAccent',
  indigo: 'bg-indigo-500/20 border-indigo-500/30 text-mercury-light',
  rose: 'bg-roseAccent/20 border-roseAccent/30 text-roseAccent',
};

export const rankBadgeStyles: Record<1 | 2 | 3, string> = {
  1: 'bg-amber-400 text-black',
  2: 'bg-slate-400 text-black',
  3: 'bg-amber-700 text-white',
};
