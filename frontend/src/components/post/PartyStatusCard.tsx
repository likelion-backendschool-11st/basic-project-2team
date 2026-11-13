import React from 'react';
import type { PostDetail } from '../../data/postData';
import { postText } from '../../data/postData';
import type { PartyState } from '../../hooks/usePostDetail';

interface PartyStatusCardProps {
  readonly detail: PostDetail;
  readonly filled: number;
  readonly percent: number;
  readonly applied: boolean;
  /** 신청이 수락돼 파티원이 된 상태(false 이면 방장 수락 대기) */
  readonly accepted: boolean;
  readonly state: PartyState;
  readonly scrapped: boolean;
  readonly onApply: () => void;
  readonly onLeave: () => void;
  readonly onScrap: () => void;
  readonly onCopy: () => void;
}

/** Member view: slot status + one-click apply. */
export const PartyStatusCard: React.FC<PartyStatusCardProps> = ({ detail, filled, percent, applied, accepted, state, scrapped, onApply, onLeave, onScrap, onCopy }) => {
  const ring = `conic-gradient(#10b981 ${percent * 3.6}deg, rgba(255,255,255,0.08) 0)`;
  const full = filled >= detail.max;
  return (
    <section className="rounded-2xl border border-night-borderLight bg-night-surface p-5 flex flex-col gap-4">
      <h2 className="text-sm font-bold text-white">{postText.statusTitle}</h2>
      <div className="flex items-center gap-4 rounded-xl bg-night-base/60 p-4">
        <div className="w-16 h-16 rounded-full p-1.5 shrink-0" style={{ background: ring }}>
          <div className="w-full h-full rounded-full bg-night-surface flex items-center justify-center font-bold text-white">{filled}<span className="text-[10px] text-fog-muted">/{detail.max}</span></div>
        </div>
        <div><div className="font-bold text-white">{postText.recruitDone(percent)}</div><div className="text-xs text-fog-muted">{full ? '모집이 완료되었습니다' : '서포터 1명 추가 입장 시 마감'}</div></div>
      </div>
      <ul className="text-xs space-y-2">
        {detail.slots.map((s) => (
          <li key={s.role} className="flex items-center justify-between rounded-lg bg-night-base/60 px-3 py-2.5">
            <span className="text-fog-headline">{s.role}</span>
            <span className={s.filled >= s.total ? 'text-fog-muted' : 'text-rose-300 font-semibold'}>{s.filled} / {s.total} 슬롯 {s.filled >= s.total ? '마감' : '급구!'}</span>
          </li>
        ))}
      </ul>
      {applied ? (
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div className="h-14 rounded-xl bg-emeraldAccent/15 text-emerald-300 text-sm font-bold flex items-center justify-center gap-2"><i className="fa-solid fa-circle-check" />{accepted ? postText.accepted : postText.applied}</div>
          <button type="button" onClick={onLeave} className="h-14 px-4 rounded-xl border border-night-borderLight text-xs text-fog-sub hover:text-white hover:bg-white/5">{accepted ? postText.leaveParty : postText.cancelApply}</button>
        </div>
      ) : (
        <button type="button" onClick={onApply} disabled={full || state !== 'open'} className="h-14 rounded-xl bg-gradient-to-r from-mercury to-indigo-500 text-white font-bold shadow-lg shadow-mercury/30 hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2">
          <i className="fa-solid fa-user-check" />{postText.apply}
        </button>
      )}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <button type="button" onClick={onScrap} className="h-10 rounded-lg bg-night-base/60 text-fog-sub hover:text-white flex items-center justify-center gap-1.5"><i className={scrapped ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'} />{scrapped ? postText.scrapped : postText.scrap}</button>
        <button type="button" onClick={onCopy} className="h-10 rounded-lg bg-night-base/60 text-fog-sub hover:text-white flex items-center justify-center gap-1.5"><i className="fa-solid fa-link" />{postText.copyLink}</button>
      </div>
      <p className="text-[11px] leading-relaxed text-fog-muted flex gap-2"><i className="fa-solid fa-shield-halved text-emeraldAccent mt-0.5" />{postText.guarantee}</p>
    </section>
  );
};

export default PartyStatusCard;
