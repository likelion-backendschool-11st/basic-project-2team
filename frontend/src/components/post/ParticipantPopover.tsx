import React from 'react';
import { Link } from 'react-router-dom';
import { paths } from '../../data/routes';
import { postText, type Participant } from '../../data/postData';
import { Avatar } from '../ui/Avatar';

interface ParticipantPopoverProps {
  readonly participant: Participant;
  /** 창을 참가자 칸의 오른쪽 끝에 맞출지 (명단 오른쪽 열에서 화면 밖으로 넘치지 않게) */
  readonly alignRight: boolean;
  /** 공대장에게만 넘깁니다. 있으면 「파티원 추방하기」 버튼이 보입니다 (파티장 본인 칸 제외). */
  readonly onKick?: (participant: Participant) => void;
  readonly onClose: () => void;
}

const menuItem = 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold';

/** 참가자 명단에서 참가자를 누르면 그 아래에 뜨는 창: 프로필 요약 + 프로필 보기 + (공대장) 추방 */
export const ParticipantPopover: React.FC<ParticipantPopoverProps> = ({ participant: p, alignRight, onKick, onClose }) => {
  const t = postText.participantMenu;
  return (
    <div role="menu" aria-label={t.label(p.name)} className={`absolute top-full z-30 mt-2 w-60 rounded-xl border border-night-borderLight bg-night-card p-3 text-left shadow-2xl ${alignRight ? 'right-0' : 'left-0'}`}>
      <div className="flex items-center gap-2.5 px-1 pb-3 mb-2 border-b border-night-borderLight">
        <Avatar url={p.avatarUrl} name={p.name} className="w-9 h-9 shrink-0 rounded-full bg-night-base flex items-center justify-center text-xs font-bold text-white" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-white truncate">{p.name}</div>
          <div className="text-[10px] text-fog-muted truncate">
            {p.level !== undefined && p.mannerTemp !== undefined ? `${t.meta(p.level, p.mannerTemp)} (${p.role})` : p.role}
          </div>
        </div>
        <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${p.leader ? 'bg-amberAccent/15 text-amber-300' : 'bg-emeraldAccent/15 text-emerald-300'}`}>
          {p.leader ? t.leaderBadge : t.memberBadge}
        </span>
      </div>
      {p.id !== undefined && (
        <Link role="menuitem" to={paths.memberProfile(p.id)} onClick={onClose} className={`${menuItem} text-fog-sub hover:text-white hover:bg-white/5`}>
          <i className="fa-regular fa-id-card w-4" />{t.viewProfile}
        </Link>
      )}
      {onKick && !p.leader && p.id !== undefined && (
        <button
          type="button"
          role="menuitem"
          onClick={() => { onKick(p); onClose(); }}
          className={`${menuItem} mt-1 border border-roseAccent/40 bg-roseAccent/10 text-rose-300 hover:bg-roseAccent/20`}
        >
          <i className="fa-solid fa-user-xmark w-4" />{t.kick}<span className="font-normal text-rose-300/70">{t.kickHint}</span>
        </button>
      )}
    </div>
  );
};

export default ParticipantPopover;
