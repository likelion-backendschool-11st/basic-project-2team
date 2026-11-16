import React from 'react';
import { partyCommentText, type CommentChannel, type CommentPartyMember } from '../../data/commentData';
import { Avatar } from '../ui/Avatar';

/**
 * 참가자 전용 댓글(공대원 시크릿 채널) 조각들 — Stitch 「참가자 전용 댓글」 화면.
 * 채널 탭 · 채널 안내 배너 · 작성창 머리(내 파티 정보) · 잠금 안내 · 댓글 작성자 파티 배지
 */

const t = partyCommentText;
const chip = 'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold';

interface ChannelTabsProps {
  readonly active: CommentChannel;
  readonly publicCount: number;
  /** 파티원이 아니면 null (수를 보여주지 않고 자물쇠만) */
  readonly partyCount: number | null;
  readonly onSelect: (channel: CommentChannel) => void;
}

/** 「전체 댓글 n」 · 「참가자 전용 n · 확정 공대원 전용 공간」 탭 */
export const CommentChannelTabs: React.FC<ChannelTabsProps> = ({ active, publicCount, partyCount, onSelect }) => {
  const tab = (id: CommentChannel, icon: string, label: string, count: number | null, extra?: React.ReactNode) => {
    const on = active === id;
    return (
      <button
        type="button"
        role="tab"
        aria-selected={on}
        onClick={() => onSelect(id)}
        className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-bold transition-colors ${on ? 'border-mercury/60 bg-mercury/15 text-white' : 'border-transparent text-fog-sub hover:text-white'}`}
      >
        <i className={`${icon} ${on ? 'text-mercury-light' : ''}`} />
        {label}
        {count !== null && <span className={`rounded-full px-1.5 text-[11px] ${on ? 'bg-mercury text-white' : 'bg-night-hover text-fog-sub'}`}>{count}</span>}
        {extra}
      </button>
    );
  };
  return (
    <div role="tablist" className="flex flex-wrap items-center gap-1">
      {tab('public', 'fa-regular fa-comments', t.publicTab, publicCount)}
      {tab(
        'party',
        'fa-solid fa-lock',
        t.partyTab,
        partyCount,
        <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-emeraldAccent/30 bg-emeraldAccent/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emeraldAccent" />{t.partyTabNote}
        </span>,
      )}
    </div>
  );
};

/** 탭 아래 「공대원 시크릿 채널 · 확정 n/m명 입장」 안내 */
export const PartyChannelBanner: React.FC<{ readonly current: number; readonly max: number }> = ({ current, max }) => (
  <div className="mb-4 flex items-start gap-3 rounded-2xl border border-mercury/30 bg-mercury/10 p-4">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-mercury/40 bg-night-base text-mercury-light"><i className="fa-solid fa-shield-halved" /></div>
    <div className="min-w-0">
      <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-white">
        {t.bannerTitle}
        <span className="rounded border border-emeraldAccent/30 bg-emeraldAccent/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">{t.entered(current, max)}</span>
      </p>
      <p className="mt-1 text-xs leading-relaxed text-fog-sub">{t.bannerDescription(current, max)}</p>
    </div>
  </div>
);

interface ComposerHeaderProps {
  readonly nickname: string;
  readonly avatarUrl: string | null;
  readonly level: number;
  readonly mannerTemp: number;
  readonly isHost: boolean;
}

/** 참가자 전용 작성창 위: 내 닉네임 · 공대장/파티원 · 레벨 · 매너 온도 · 「공대원 전용 비공개」 */
export const PartyComposerHeader: React.FC<ComposerHeaderProps> = ({ nickname, avatarUrl, level, mannerTemp, isHost }) => (
  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <Avatar url={avatarUrl} name={nickname} className="flex h-7 w-7 items-center justify-center rounded-full bg-mercury text-[11px] font-bold text-white" />
      <span className="font-bold text-white">{nickname}</span>
      <RoleBadge isHost={isHost} />
      <span className={`${chip} border border-night-borderLight bg-night-hover text-fog-sub`}>{t.level(level)}</span>
      <MannerChip temp={mannerTemp} />
    </div>
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-mercury/40 bg-mercury/15 px-2.5 py-1 text-[11px] font-semibold text-indigo-200"><i className="fa-solid fa-lock text-[10px]" />{t.privateChip}</span>
  </div>
);

/** 파티원이 아닌 사람이 참가자 전용 탭을 열었을 때 */
export const PartyChannelLocked: React.FC = () => (
  <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-night-borderLight bg-night-base/50 px-6 py-12 text-center">
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-mercury/15 text-mercury-light"><i className="fa-solid fa-lock" /></div>
    <p className="text-sm font-bold text-white">{t.lockedTitle}</p>
    <p className="max-w-sm text-xs leading-relaxed text-fog-muted">{t.lockedDescription}</p>
  </div>
);

const RoleBadge: React.FC<{ readonly isHost: boolean }> = ({ isHost }) =>
  isHost ? (
    <span className={`${chip} bg-mercury text-white`}><i className="fa-solid fa-crown text-[9px]" />{t.host}</span>
  ) : (
    <span className={`${chip} border border-mercury/40 bg-mercury/10 text-indigo-200`}><i className="fa-solid fa-shield-halved text-[9px]" />{t.member}</span>
  );

const MannerChip: React.FC<{ readonly temp: number }> = ({ temp }) => (
  <span className={`${chip} border border-emeraldAccent/30 bg-emeraldAccent/15 text-emerald-300`}>{t.manner(temp)}</span>
);

/** 참가자 전용 댓글 작성자 줄의 배지: 공대장/파티원 · 포지션 · 매너 온도 · 공대원 인증. 파티를 떠났으면 「前 파티원」 */
export const PartyMemberBadges: React.FC<{ readonly member: CommentPartyMember | null | undefined }> = ({ member }) => {
  if (!member) return <span className={`${chip} border border-night-borderLight text-fog-muted`}>{t.formerMember}</span>;
  return (
    <>
      <RoleBadge isHost={member.isHost} />
      {member.role && <span className={`${chip} border border-night-borderLight bg-night-hover text-fog-sub`}>{member.role}</span>}
      <MannerChip temp={member.mannerTemp} />
      <span className={`${chip} border border-mercury/30 bg-mercury/10 text-indigo-200`}><i className="fa-regular fa-circle-check text-[9px]" />{t.verified}</span>
    </>
  );
};
