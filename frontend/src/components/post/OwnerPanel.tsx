import React from 'react';
import type { Participant, PostDetail } from '../../data/postData';
import { postText } from '../../data/postData';
import type { PartyState } from '../../hooks/usePostDetail';

interface OwnerPanelProps {
  readonly detail: PostDetail;
  readonly participants: readonly Participant[];
  readonly state: PartyState;
  readonly onClose: () => void;
  readonly onTogglePause: () => void;
  readonly onDisband: () => void;
}

/** Owner view: participants roster + conditions + recruit controls. */
export const OwnerPanel: React.FC<OwnerPanelProps> = ({ detail, participants, state, onClose, onTogglePause, onDisband }) => (
  <>
    <section className="rounded-2xl border border-night-borderLight bg-night-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2"><i className="fa-solid fa-users text-mercury-light" />{postText.participantsTitle}</h2>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emeraldAccent/15 text-emerald-300">{participants.length} / {detail.max}</span>
      </div>
      <ul className="grid grid-cols-4 gap-3 text-center">
        {participants.map((p) => (
          <li key={`${p.leader ? 'host' : 'member'}-${p.name}`}>
            <span className={`mx-auto w-12 h-12 rounded-full bg-night-card flex items-center justify-center text-sm font-bold text-white border-2 ${p.leader ? 'border-amberAccent' : 'border-night-borderLight'}`}>{p.name[0]}</span>
            <div className="text-[11px] text-white mt-1.5 truncate">{p.name}</div>
            <div className="text-[10px] text-fog-muted">{p.role}</div>
          </li>
        ))}
        {Array.from({ length: Math.max(0, detail.max - participants.length) }, (_, i) => (
          <li key={`empty-${i}`}><span className="mx-auto w-12 h-12 rounded-full border-2 border-dashed border-mercury/50 text-mercury-light flex items-center justify-center"><i className="fa-solid fa-plus" /></span><div className="text-[11px] text-mercury-light mt-1.5">{postText.emptySlot}</div></li>
        ))}
      </ul>
    </section>
    <section className="rounded-2xl border border-night-borderLight bg-night-surface p-5">
      <h2 className="text-sm font-bold text-white mb-3">{postText.conditionsTitle}</h2>
      <dl className="divide-y divide-night-borderLight text-xs">
        {detail.conditions.map((c) => (
          <div key={c.label} className="flex justify-between gap-3 py-2.5"><dt className="text-fog-muted">{c.label}</dt><dd className="text-white font-semibold text-right">{c.value}</dd></div>
        ))}
      </dl>
      <div className="mt-4 flex flex-col gap-2">
        <button type="button" onClick={onClose} disabled={state === 'closed'} className="h-12 rounded-xl bg-gradient-to-r from-mercury to-indigo-500 text-white text-sm font-bold disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"><i className="fa-regular fa-circle-check" />{postText.closeRecruit}</button>
        <button type="button" onClick={onTogglePause} disabled={state === 'closed'} className="h-11 rounded-xl border border-night-borderLight bg-night-base text-xs font-semibold text-amber-300 disabled:opacity-40 disabled:pointer-events-none">{state === 'paused' ? postText.resumeRecruit : postText.pauseRecruit}</button>
        <button type="button" onClick={onDisband} className="h-11 rounded-xl border border-roseAccent/30 text-xs font-semibold text-rose-300 hover:bg-roseAccent/10">파티 해산</button>
        <p className="text-[11px] text-fog-muted text-center">{postText.closedNote}</p>
      </div>
    </section>
  </>
);

export default OwnerPanel;
