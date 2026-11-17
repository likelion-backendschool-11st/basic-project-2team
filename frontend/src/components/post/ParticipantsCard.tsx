import React from 'react';
import type { Participant } from '../../data/postData';
import { postText } from '../../data/postData';
import type { NoShowTarget } from '../../hooks/useNoShowReport';
import { useParticipantMenu } from '../../hooks/useParticipantMenu';
import { Avatar } from '../ui/Avatar';
import ParticipantPopover from './ParticipantPopover';

/** 노쇼 신고 버튼 설정. 내가 확정 인원이고 출발 시간이 지났을 때만 넘깁니다. */
export interface ParticipantNoShow {
  readonly myId: number;
  readonly isReported: (memberId: number) => boolean;
  readonly onReport: (target: NoShowTarget) => void;
}

interface ParticipantsCardProps {
  readonly participants: readonly Participant[];
  readonly max: number;
  readonly noShow?: ParticipantNoShow;
  /** 공대장 화면에서만 넘깁니다. 참가자 메뉴에 「파티원 추방하기」가 생깁니다. */
  readonly onKick?: (participant: Participant) => void;
}

const COLUMNS = 4;

/** 파티 참가자 명단(파티장 + 승인된 파티원 + 남은 자리). 참가자를 누르면 프로필 보기 · (공대장) 추방 메뉴가 뜹니다. */
export const ParticipantsCard: React.FC<ParticipantsCardProps> = ({ participants, max, noShow, onKick }) => {
  const menu = useParticipantMenu();
  return (
    <section className="rounded-2xl border border-night-borderLight bg-night-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2"><i className="fa-solid fa-users text-mercury-light" />{postText.participantsTitle}</h2>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emeraldAccent/15 text-emerald-300">{participants.length} / {max}</span>
      </div>
      <ul ref={menu.listRef} className="grid grid-cols-4 gap-3 text-center">
        {participants.map((p, i) => {
          const key = `${p.leader ? 'host' : 'member'}-${p.id ?? p.name}`;
          const open = menu.openKey === key;
          return (
            <li key={key} className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => menu.toggle(key)}
                className={`block w-full rounded-xl py-1.5 hover:bg-white/5 ${open ? 'bg-white/5 ring-1 ring-mercury/60' : ''}`}
              >
                <Avatar url={p.avatarUrl} name={p.name} className={`mx-auto w-12 h-12 rounded-full bg-night-card flex items-center justify-center text-sm font-bold text-white border-2 ${p.leader ? 'border-amberAccent' : 'border-night-borderLight'}`} />
                <div className="text-[11px] text-white mt-1.5 truncate px-1">{p.name}</div>
                <div className="text-[10px] text-fog-muted">{p.role}</div>
              </button>
              {open && <ParticipantPopover participant={p} alignRight={i % COLUMNS >= COLUMNS / 2} onKick={onKick} onClose={menu.close} />}
              {/* 노쇼 신고는 승인된 파티원만 대상입니다 (파티장·나 자신 제외). */}
              {noShow && p.id !== undefined && !p.leader && p.id !== noShow.myId && (() => {
                const memberId = p.id;
                const reported = noShow.isReported(memberId);
                return (
                  <button type="button" disabled={reported} onClick={() => noShow.onReport({ memberId, name: p.name })} className="mt-1 text-[10px] text-fog-muted hover:text-rose-300 disabled:opacity-50 disabled:pointer-events-none">
                    <i className="fa-solid fa-user-slash mr-0.5" />{reported ? postText.noShow.reported : postText.noShow.report}
                  </button>
                );
              })()}
            </li>
          );
        })}
        {Array.from({ length: Math.max(0, max - participants.length) }, (_, i) => (
          <li key={`empty-${i}`}><span className="mx-auto w-12 h-12 rounded-full border-2 border-dashed border-mercury/50 text-mercury-light flex items-center justify-center"><i className="fa-solid fa-plus" /></span><div className="text-[11px] text-mercury-light mt-1.5">{postText.emptySlot}</div></li>
        ))}
      </ul>
    </section>
  );
};

export default ParticipantsCard;
