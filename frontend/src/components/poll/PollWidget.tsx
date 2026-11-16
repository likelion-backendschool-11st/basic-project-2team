import React from 'react';
import { formatClock, votePercent, type PollResponse } from '../../api/pollApi';
import { pollText } from '../../data/pollData';

interface PollWidgetProps {
  readonly poll: PollResponse;
  /** 공대장 닉네임 (안내 문구 앞에 표시) */
  readonly hostName: string;
  readonly selected: readonly number[];
  /** 고른 항목이 서버의 내 투표와 다름 → 투표 버튼 활성화 */
  readonly dirty: boolean;
  readonly busy: boolean;
  readonly canEdit: boolean;
  readonly onToggle: (optionId: number) => void;
  readonly onVote: () => void;
  readonly onTogglePin: () => void;
  readonly onEdit: () => void;
  readonly onConfirm: () => void;
  readonly onParticipants: () => void;
  readonly onRefresh: () => void;
  readonly onToComments: () => void;
}

const chip = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold';
const tool = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors';

/** 투표할 수 없는 이유 (투표 버튼 자리에 표시) */
function blockedReason(poll: PollResponse) {
  if (poll.status !== 'OPEN') return pollText.notOpen;
  if (!poll.viewer) return pollText.loginToVote;
  if (!poll.viewer.isMember) return pollText.membersOnly;
  return poll.commentersOnly ? pollText.commentersOnly : pollText.membersOnly;
}

/** 마감까지 남은 시간 뱃지 문구 */
function deadlineLabel(poll: PollResponse) {
  const closesAt = new Date(poll.closesAt);
  if (poll.status !== 'OPEN') return pollText.closedAt(formatClock(new Date(poll.confirmedAt ?? poll.closesAt)));
  return pollText.closesIn(Math.max(1, Math.ceil((closesAt.getTime() - Date.now()) / 60000)), formatClock(closesAt));
}

/** Stitch 「공대장 공지 — 실시간 투표」 위젯: 항목별 득표 막대, 내 선택, 공대장 도구(고정·편집·확정) */
export const PollWidget: React.FC<PollWidgetProps> = (p) => {
  const { poll } = p;
  const viewer = poll.viewer;
  const voted = viewer?.votedOptionIds ?? [];
  const canVote = viewer?.canVote ?? false;
  const confirmed = poll.status === 'CONFIRMED';
  const top = Math.max(0, ...poll.options.map((o) => o.voteCount));
  const summary = pollText.summary(poll.totalVoters, poll.eligibleCount);

  const voteLabel = !p.dirty
    ? voted.length > 0 ? pollText.done : pollText.pickFirst
    : p.selected.length === 0 ? pollText.cancelVote : voted.length > 0 ? pollText.change : pollText.submit;

  return (
    <section aria-label={poll.title} className="relative overflow-hidden rounded-2xl border border-mercury/40 bg-gradient-to-b from-night-card to-night-surface p-5 sm:p-6 shadow-2xl">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-mercury/15 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-2 border-b border-night-borderLight pb-3.5">
        <div className="flex flex-wrap items-center gap-2">
          {poll.pinned && <span className={`${chip} border-amberAccent/30 bg-amberAccent/15 text-amber-300`}>👑 {pollText.pinnedBadge}</span>}
          {poll.status === 'OPEN' && (
            <span className={`${chip} border-emeraldAccent/30 bg-emeraldAccent/15 text-emerald-300`}><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emeraldAccent" />{pollText.live}</span>
          )}
          {poll.status === 'ENDED' && <span className={`${chip} border-night-borderLight bg-night-hover text-fog-sub`}>{pollText.ended}</span>}
          {confirmed && <span className={`${chip} border-mercury/40 bg-mercury/20 text-indigo-200`}><i className="fa-solid fa-flag-checkered" />{pollText.confirmed}</span>}
          <span className="inline-flex items-center gap-1 rounded border border-roseAccent/30 bg-roseAccent/10 px-2 py-0.5 text-[11px] font-semibold text-rose-300"><i className="fa-regular fa-clock" />{deadlineLabel(poll)}</span>
        </div>
        {viewer?.isHost && (
          <div className="flex flex-wrap items-center gap-1">
            <button type="button" onClick={p.onTogglePin} disabled={p.busy} className={`${tool} text-fog-muted hover:bg-night-hover hover:text-white`}><i className="fa-solid fa-thumbtack" />{poll.pinned ? pollText.unpin : pollText.pin}</button>
            {p.canEdit && <button type="button" onClick={p.onEdit} className={`${tool} text-fog-muted hover:bg-night-hover hover:text-white`}><i className="fa-solid fa-sliders" />{pollText.edit}</button>}
            {!confirmed && <button type="button" onClick={p.onConfirm} className={`${tool} text-amber-300 hover:bg-amberAccent/10`}><i className="fa-solid fa-trophy" />{poll.status === 'ENDED' ? pollText.confirmEnded : pollText.close}</button>}
          </div>
        )}
      </div>

      <div className="relative flex flex-col gap-4 pt-3.5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-white"><span className="text-xl font-black text-mercury-light">Q.</span>{poll.title}</h2>
            <span className="rounded border border-mercury/30 bg-night-base px-2 py-0.5 text-xs font-medium text-indigo-200">{poll.multiple ? pollText.multiple : pollText.single}</span>
          </div>
          {(confirmed ? poll.notice : poll.description) && (
            <p className="flex items-start gap-2 rounded-xl border border-night-borderLight bg-night-deep px-3.5 py-2.5 text-xs leading-relaxed text-fog-sub">
              <i className="fa-solid fa-bullhorn mt-0.5 shrink-0 text-mercury-light" />
              <span><strong className="font-semibold text-white">{pollText.hostSays(p.hostName)}</strong> {confirmed ? poll.notice : poll.description}</span>
            </p>
          )}
        </div>

        <div className="space-y-2.5" role={canVote ? 'group' : undefined}>
          {poll.options.map((option) => {
            const pct = votePercent(option.voteCount, poll.totalVoters);
            const picked = p.selected.includes(option.id);
            const final = poll.finalOptionId === option.id;
            const leading = option.voteCount > 0 && option.voteCount === top;
            const highlight = picked || final;
            return (
              <button
                key={option.id}
                type="button"
                disabled={!canVote || p.busy}
                aria-pressed={canVote ? picked : undefined}
                onClick={() => p.onToggle(option.id)}
                className={`group relative w-full rounded-xl border p-3.5 text-left transition disabled:cursor-default ${highlight ? 'border-mercury bg-mercury/10 shadow-md' : 'border-night-borderLight bg-night-base hover:enabled:border-fog-muted'}`}
              >
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
                  <div className={`h-full rounded-xl transition-all duration-500 ${highlight || leading ? 'bg-mercury/25' : 'bg-night-hover/70'}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="relative flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {canVote ? (
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 transition ${poll.multiple ? 'rounded-md' : 'rounded-full'} ${picked ? 'border-mercury bg-mercury' : 'border-fog-muted'}`}>
                        {picked && (poll.multiple ? <i className="fa-solid fa-check text-[10px] text-white" /> : <span className="h-2 w-2 rounded-full bg-white" />)}
                      </span>
                    ) : final ? (
                      <span className="shrink-0 text-base">👑</span>
                    ) : null}
                    <span className={`flex flex-wrap items-center gap-2 text-sm font-bold ${highlight ? 'text-white' : 'text-fog-headline'}`}>
                      {option.label}
                      {voted.includes(option.id) && <span className="rounded border border-mercury/40 bg-mercury/20 px-1.5 text-[10px] font-bold text-indigo-200">{pollText.myChoice}</span>}
                      {final && <span className="rounded border border-amberAccent/40 bg-amberAccent/15 px-1.5 text-[10px] font-bold text-amber-300">{pollText.finalChoice}</span>}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-right">
                    <span className={`font-mono text-base ${leading ? 'font-extrabold text-mercury-light' : 'font-bold text-fog-sub'}`}>{pct}%</span>
                    <span className="font-mono text-xs text-fog-muted">{pollText.votes(option.voteCount)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-night-borderLight pt-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-fog-muted">
            <i className="fa-solid fa-users text-emerald-300" />
            <span><strong className="font-bold text-white">{summary.total}</strong>{summary.rest}<span className="font-bold text-emerald-300">{summary.ratio}</span>{summary.tail}</span>
            <span className="text-night-borderLight">·</span>
            <span>{poll.multiple ? pollText.multipleNote : pollText.singleNote}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {poll.participants && (
              <button type="button" onClick={p.onParticipants} className={`${tool} border border-mercury/30 bg-mercury/15 font-semibold text-indigo-200 hover:bg-mercury/25`}><i className="fa-solid fa-user-check" />{pollText.participants}</button>
            )}
            <button type="button" onClick={p.onRefresh} className={`${tool} bg-night-hover text-fog-sub hover:text-white`}><i className="fa-solid fa-rotate" />{pollText.refresh}</button>
            <button type="button" onClick={p.onToComments} className={`${tool} border border-mercury/40 bg-mercury/20 font-semibold text-indigo-200 hover:bg-mercury/30`}><i className="fa-regular fa-comment-dots" />{pollText.toComments}</button>
            {canVote ? (
              <button
                type="button"
                onClick={p.onVote}
                disabled={!p.dirty || p.busy}
                className={`${tool} px-4 font-bold shadow-md ${!p.dirty && voted.length > 0 ? 'bg-emeraldAccent text-night-base' : 'bg-mercury text-white hover:bg-mercury-light'} disabled:cursor-default disabled:opacity-80 enabled:active:scale-95`}
              >
                <i className={`fa-solid ${!p.dirty && voted.length > 0 ? 'fa-check-double' : 'fa-check-to-slot'}`} />{voteLabel}
              </button>
            ) : (
              <span className="px-1 text-[11px] text-fog-muted">{blockedReason(poll)}</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PollWidget;
