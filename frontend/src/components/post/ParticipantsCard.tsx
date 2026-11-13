import React from 'react';
import type { Participant } from '../../data/postData';
import { postText } from '../../data/postData';

interface ParticipantsCardProps {
  readonly participants: readonly Participant[];
  readonly max: number;
}

/** 파티 참가자 명단(파티장 + 승인된 파티원 + 남은 자리). 작성자·파티원·비로그인 모두에게 보입니다. */
export const ParticipantsCard: React.FC<ParticipantsCardProps> = ({ participants, max }) => (
  <section className="rounded-2xl border border-night-borderLight bg-night-surface p-5">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-bold text-white flex items-center gap-2"><i className="fa-solid fa-users text-mercury-light" />{postText.participantsTitle}</h2>
      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emeraldAccent/15 text-emerald-300">{participants.length} / {max}</span>
    </div>
    <ul className="grid grid-cols-4 gap-3 text-center">
      {participants.map((p) => (
        <li key={`${p.leader ? 'host' : 'member'}-${p.name}`}>
          <span className={`mx-auto w-12 h-12 rounded-full bg-night-card flex items-center justify-center text-sm font-bold text-white border-2 ${p.leader ? 'border-amberAccent' : 'border-night-borderLight'}`}>{p.name[0]}</span>
          <div className="text-[11px] text-white mt-1.5 truncate">{p.name}</div>
          <div className="text-[10px] text-fog-muted">{p.role}</div>
        </li>
      ))}
      {Array.from({ length: Math.max(0, max - participants.length) }, (_, i) => (
        <li key={`empty-${i}`}><span className="mx-auto w-12 h-12 rounded-full border-2 border-dashed border-mercury/50 text-mercury-light flex items-center justify-center"><i className="fa-solid fa-plus" /></span><div className="text-[11px] text-mercury-light mt-1.5">{postText.emptySlot}</div></li>
      ))}
    </ul>
  </section>
);

export default ParticipantsCard;
