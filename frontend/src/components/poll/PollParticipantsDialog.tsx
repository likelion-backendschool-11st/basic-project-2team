import React, { useState } from 'react';
import { timeAgo } from '../../api/postDetailApi';
import { votePercent, type PollPerson, type PollResponse } from '../../api/pollApi';
import { pollText, type PollParticipantTab } from '../../data/pollData';
import Modal from '../ui/Modal';

interface PollParticipantsDialogProps {
  readonly poll: PollResponse;
  readonly busy: boolean;
  readonly onRemind: () => void;
  readonly onClose: () => void;
}

/** 항목 순서대로 막대·칩 색 (디자인 토큰) */
const optionTones = ['bg-mercury', 'bg-periwinkle', 'bg-emeraldAccent', 'bg-amberAccent', 'bg-lavender'] as const;
const tab = 'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all';
const row = 'flex items-center justify-between gap-3 rounded-xl border p-3.5';
const tempChip = 'rounded-full border border-emeraldAccent/40 bg-emeraldAccent/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300';

const Avatar: React.FC<{ readonly person: PollPerson; readonly mine: boolean }> = ({ person, mine }) => (
  <div className="relative shrink-0">
    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${person.isHost ? 'bg-mercury' : 'bg-night-hover'} ${mine ? 'ring-2 ring-emeraldAccent/50' : ''}`}>
      {Array.from(person.nickname)[0] ?? '?'}
    </div>
    {person.isHost && <span className="absolute -bottom-1 -right-1 rounded-full bg-night-card p-0.5 text-[11px] leading-none">👑</span>}
  </div>
);

/** Stitch 「투표 참여자 현황 확인」(_1) 모달: 항목별 탭, 투표 시각, 미투표·구인 중 자리, 미투표자 알림 */
export const PollParticipantsDialog: React.FC<PollParticipantsDialogProps> = ({ poll, busy, onRemind, onClose }) => {
  const t = pollText.participantsDialog;
  const [current, setCurrent] = useState<PollParticipantTab>('all');
  const voters = poll.participants?.voters ?? [];
  const nonVoters = poll.participants?.nonVoters ?? [];
  const openSlots = Math.max(0, poll.headcount - poll.currentCount);
  const unvotedTotal = nonVoters.length + openSlots;
  const seats = poll.eligibleCount + openSlots;
  const myId = poll.viewer?.memberId ?? null;
  const toneOf = (optionId: number) => optionTones[Math.max(0, poll.options.findIndex((o) => o.id === optionId)) % optionTones.length];
  const labelOf = (optionId: number) => poll.options.find((o) => o.id === optionId)?.label ?? '';
  // 막대 전체 = 모든 득표 + 미투표 자리 (복수 선택이면 득표 합이 인원보다 클 수 있음)
  const barTotal = poll.options.reduce((sum, o) => sum + o.voteCount, 0) + unvotedTotal;
  const barWidth = (n: number) => `${barTotal === 0 ? 0 : (n / barTotal) * 100}%`;

  const shownVoters = current === 'all' ? voters : typeof current === 'number' ? voters.filter((v) => v.optionIds.includes(current)) : [];
  const showUnvoted = current === 'unvoted';
  const isEmpty = showUnvoted ? unvotedTotal === 0 : shownVoters.length === 0;

  const tabButton = (id: PollParticipantTab, text: string, tone: 'brand' | 'rose' = 'brand') => (
    <button
      key={String(id)}
      type="button"
      aria-pressed={current === id}
      onClick={() => setCurrent(id)}
      className={`${tab} ${current === id ? `${tone === 'rose' ? 'bg-roseAccent' : 'bg-mercury'} font-bold text-white shadow-sm` : tone === 'rose' ? 'text-rose-300 hover:bg-roseAccent/10' : 'text-fog-muted hover:text-white'}`}
    >
      {text}
    </button>
  );

  return (
    <Modal isOpen onClose={onClose} ariaLabel={t.title} widthClass="max-w-[620px]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mercury text-white"><i className="fa-solid fa-check-to-slot" /></div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-white sm:text-lg">{t.title}</h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-emeraldAccent/40 bg-emeraldAccent/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emeraldAccent" />{t.badge}</span>
            </div>
            <p className="text-xs text-fog-muted">{t.subtitle}</p>
          </div>
        </div>
        <button type="button" aria-label={t.close} onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-night-card text-fog-sub hover:text-white"><i className="fa-solid fa-xmark" /></button>
      </div>

      <div className="mt-5 flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
        <div className="flex flex-col gap-3 rounded-xl border border-night-borderLight bg-night-base p-4">
          <p className="flex items-start gap-2.5 text-sm font-semibold leading-snug text-white sm:text-base"><span className="font-bold text-mercury-light">Q.</span>{poll.title}</p>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-fog-muted">
            <span className="flex items-center gap-2">
              <span>{t.totalLabel} <strong className="font-semibold text-white">{t.turnout(poll.totalVoters, votePercent(poll.totalVoters, seats))}</strong></span>
              <span>·</span>
              <span className="font-semibold text-rose-300">{t.unvotedCount(unvotedTotal)}</span>
            </span>
            <span className="rounded border border-emeraldAccent/40 bg-emeraldAccent/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">{t.capacity(poll.currentCount, poll.headcount)}</span>
          </div>
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-night-hover">
            {poll.options.map((o) => (
              <div key={o.id} className={toneOf(o.id)} style={{ width: barWidth(o.voteCount) }} title={`${o.label} (${o.voteCount})`} />
            ))}
            <div className="bg-roseAccent" style={{ width: barWidth(unvotedTotal) }} title={t.unvoted(unvotedTotal)} />
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-night-borderLight bg-night-base p-1">
          {tabButton('all', t.all(voters.length))}
          {poll.options.map((o) => tabButton(o.id, t.option(o.label, o.voteCount)))}
          {tabButton('unvoted', t.unvoted(unvotedTotal), 'rose')}
        </div>

        <ul className="flex flex-col gap-2.5">
          {shownVoters.map((v) => {
            const mine = v.memberId === myId;
            return (
              <li key={v.memberId} className={`${row} ${mine ? 'border-emeraldAccent/30' : 'border-night-borderLight'} bg-night-card/60`}>
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar person={v} mine={mine} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-bold text-white">{v.nickname}</span>
                      {v.isHost && <span className="rounded bg-mercury px-1.5 text-[10px] font-bold text-white">{t.host}</span>}
                      {mine && <span className="rounded-full border border-emeraldAccent/40 bg-emeraldAccent/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">{t.me}</span>}
                      <span className={tempChip}>{v.mannerTemp.toFixed(1)}°C</span>
                    </div>
                    <p className="text-xs text-fog-muted">{t.votedAgo(timeAgo(v.votedAt))}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                  {v.optionIds.map((id) => (
                    <span key={id} className="inline-flex items-center gap-1.5 rounded-lg border border-mercury/30 bg-mercury/15 px-2.5 py-1 text-xs font-semibold text-indigo-200">
                      <span className={`h-2 w-2 rounded-full ${toneOf(id)}`} />{labelOf(id)}
                    </span>
                  ))}
                  <i className="fa-solid fa-circle-check text-emeraldAccent" />
                </div>
              </li>
            );
          })}
          {showUnvoted && nonVoters.map((n) => (
            <li key={n.memberId} className={`${row} border-roseAccent/30 bg-roseAccent/10`}>
              <div className="flex min-w-0 items-center gap-3">
                <Avatar person={n} mine={n.memberId === myId} />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-bold text-white">{n.nickname}</span>
                  {n.isHost && <span className="rounded bg-mercury px-1.5 text-[10px] font-bold text-white">{t.host}</span>}
                  <span className={tempChip}>{n.mannerTemp.toFixed(1)}°C</span>
                </div>
              </div>
              <span className="rounded-lg border border-roseAccent/40 bg-roseAccent/20 px-3 py-1 text-xs font-bold text-rose-300">{t.notVoted}</span>
            </li>
          ))}
          {showUnvoted && Array.from({ length: openSlots }, (_, i) => (
            <li key={`slot-${i}`} className={`${row} border-dashed border-roseAccent/30 bg-roseAccent/5`}>
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-roseAccent/40 bg-roseAccent/20 text-sm font-bold text-rose-300">?</div>
                <div>
                  <span className="rounded-full border border-roseAccent/40 bg-roseAccent/20 px-2 py-0.5 text-[10px] font-bold text-rose-300">{t.recruiting}</span>
                  <p className="mt-1 text-xs text-fog-muted">{t.recruitingNote}</p>
                </div>
              </div>
              <i className="fa-regular fa-clock text-rose-300" />
            </li>
          ))}
          {isEmpty && <li className="py-6 text-center text-sm text-fog-muted">{t.empty}</li>}
        </ul>

        <p className="flex items-start gap-2.5 rounded-xl border border-night-borderLight bg-night-base p-3.5 text-xs leading-relaxed text-fog-sub">
          <i className="fa-solid fa-circle-info mt-0.5 shrink-0 text-mercury-light" />{t.note}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-xs text-fog-muted"><span className="h-2 w-2 rounded-full bg-emeraldAccent" />{t.footer}</span>
        <div className="ml-auto flex items-center gap-2.5">
          <button type="button" onClick={onClose} className="rounded-xl bg-night-card px-4 py-2 text-xs font-semibold text-fog-sub hover:text-white">{t.close}</button>
          {poll.viewer?.isHost && poll.status === 'OPEN' && (
            <button type="button" onClick={onRemind} disabled={busy || nonVoters.every((n) => n.isHost)} className="inline-flex items-center gap-1.5 rounded-xl bg-mercury px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-mercury-light disabled:opacity-40">
              <i className="fa-solid fa-bullhorn" />{t.remind}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default PollParticipantsDialog;
