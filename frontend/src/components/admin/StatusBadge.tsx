import React from 'react';
import type { Tone } from '../../data/adminData';

const tones: Record<Tone, string> = {
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  indigo: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  slate: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  sky: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
};

export const StatusBadge: React.FC<{ readonly tone: Tone; readonly children: React.ReactNode }> = ({ tone, children }) => (
  <span className={`inline-block whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-semibold border ${tones[tone]}`}>{children}</span>
);

export default StatusBadge;
