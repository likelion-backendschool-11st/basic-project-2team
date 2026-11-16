import React, { useMemo, useState } from 'react';
import { votePercent, type PollCloseInput, type PollResponse } from '../../api/pollApi';
import { POLL_NOTICE_MAX, pollText } from '../../data/pollData';
import Modal from '../ui/Modal';

interface PollCloseDialogProps {
  readonly poll: PollResponse;
  readonly busy: boolean;
  readonly onSubmit: (input: PollCloseInput) => void;
  readonly onClose: () => void;
}

const check = 'mt-0.5 rounded border-night-borderLight bg-night-card text-mercury focus:ring-mercury';

/** Stitch 「투표 조기 마감 및 결과 확정」(_3) 모달. 득표순으로 보여주고 1위를 미리 골라 둡니다. */
export const PollCloseDialog: React.FC<PollCloseDialogProps> = ({ poll, busy, onSubmit, onClose }) => {
  const t = pollText.closeDialog;
  // 득표 많은 순 (같으면 원래 순서)
  const ranked = useMemo(() => [...poll.options].sort((a, b) => b.voteCount - a.voteCount), [poll.options]);
  const votersOf = (optionId: number) => (poll.participants?.voters ?? []).filter((v) => v.optionIds.includes(optionId)).map((v) => v.nickname);
  const labelOf = (optionId: number) => poll.options.find((o) => o.id === optionId)?.label ?? '';

  const [finalId, setFinalId] = useState(ranked[0].id);
  const [notice, setNotice] = useState(() => t.noticeTemplate(ranked[0].label));
  const [noticeEdited, setNoticeEdited] = useState(false);
  const [keepPinned, setKeepPinned] = useState(true);
  const [postComment, setPostComment] = useState(true);
  const [notifyMembers, setNotifyMembers] = useState(true);

  // 공지를 직접 고치지 않았으면 고른 항목에 맞춰 문구를 바꿉니다.
  const pick = (optionId: number) => {
    setFinalId(optionId);
    if (!noticeEdited) setNotice(t.noticeTemplate(labelOf(optionId)));
  };
  const turnoutPct = votePercent(poll.totalVoters, poll.eligibleCount);
  const turnout = t.turnout(poll.totalVoters, poll.eligibleCount, turnoutPct);
  const memberCount = Math.max(0, poll.eligibleCount - 1);

  const submit = () =>
    onSubmit({ finalOptionId: finalId, ...(notice.trim() ? { notice: notice.trim() } : {}), pinned: keepPinned, postComment, notifyMembers });

  return (
    <Modal isOpen onClose={onClose} ariaLabel={t.title} widthClass="max-w-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amberAccent/15 text-amberAccent"><i className="fa-solid fa-trophy" /></div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-white">{t.title}</h2>
              <span className="rounded-full border border-amberAccent/30 bg-amberAccent/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">👑 {t.badge}</span>
            </div>
            <p className="text-xs text-fog-muted">{t.subtitle}</p>
          </div>
        </div>
        <button type="button" aria-label={t.cancel} onClick={onClose} className="text-fog-sub hover:text-white"><i className="fa-solid fa-xmark" /></button>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-fog-sub">{t.description}</p>

      <div className="mt-4 flex max-h-[55vh] flex-col gap-4 overflow-y-auto pr-1">
        <div className="rounded-xl border border-night-borderLight bg-night-base p-4">
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold">
            <span className="text-fog-muted">{t.agenda}</span>
            <span className="rounded bg-emeraldAccent/15 px-2 py-0.5 text-emerald-300">{t.tallied}</span>
          </div>
          <p className="text-sm font-semibold text-white">Q. {poll.title}</p>
          <p className="mt-2 flex flex-wrap gap-x-2 text-xs text-fog-muted">
            <strong className="text-white">{turnout.total}</strong><span>·</span><span className="text-emerald-300">{turnout.rate}</span><span>{turnout.ratio}</span>
          </p>
        </div>

        <fieldset>
          <legend className="mb-2 flex w-full items-center justify-between text-xs font-semibold text-fog-sub">
            <span>{t.pick}<span className="text-roseAccent">*</span></span>
            <span className="text-[11px] font-normal text-fog-muted">{t.autoPicked}</span>
          </legend>
          <div className="flex flex-col gap-2">
            {ranked.map((option, index) => {
              const picked = finalId === option.id;
              const pct = votePercent(option.voteCount, poll.totalVoters);
              return (
                <label key={option.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 ${picked ? 'border-mercury bg-mercury/10' : 'border-night-borderLight hover:border-fog-muted'}`}>
                  <input type="radio" name="poll-final" className="sr-only" checked={picked} onChange={() => pick(option.id)} />
                  <span className={`h-4 w-4 shrink-0 rounded-full border-2 ${picked ? 'border-mercury bg-mercury' : 'border-fog-muted'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-bold text-white">
                      {t.rank(index + 1)} {option.label}
                      {index === 0 && option.voteCount > 0 && <span className="rounded border border-amberAccent/40 bg-amberAccent/15 px-1.5 text-[10px] text-amber-300">👑 {t.top}</span>}
                    </span>
                    <span className="block truncate text-[11px] text-fog-muted">{t.voters(votersOf(option.id))}</span>
                  </span>
                  <span className="shrink-0 text-right font-mono">
                    <span className="block text-sm font-bold text-mercury-light">{option.voteCount}표</span>
                    <span className="text-[11px] text-fog-muted">{pct}%</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div>
          <span className="mb-2 block text-xs font-semibold text-fog-sub">{t.sync}</span>
          <div className="flex flex-col gap-3 rounded-xl border border-night-borderLight bg-night-base p-3.5 text-xs">
            {[
              { checked: keepPinned, set: setKeepPinned, title: t.keepPinned, note: t.keepPinnedNote },
              { checked: postComment, set: setPostComment, title: t.postComment, note: t.postCommentNote },
              { checked: notifyMembers, set: setNotifyMembers, title: t.notify, note: t.notifyNote(memberCount) },
            ].map((row) => (
              <label key={row.title} className="flex cursor-pointer items-start gap-2.5">
                <input type="checkbox" className={check} checked={row.checked} onChange={(e) => row.set(e.target.checked)} />
                <span><span className="font-semibold text-fog-headline">{row.title}</span><span className="block text-[11px] text-fog-muted">{row.note}</span></span>
              </label>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-2 flex items-center justify-between text-xs font-semibold text-fog-sub">
            <span>{t.notice}</span>
            <span className="font-mono text-[11px] font-normal text-fog-muted">{Array.from(notice).length} / {POLL_NOTICE_MAX}자</span>
          </span>
          <textarea
            value={notice}
            maxLength={POLL_NOTICE_MAX}
            rows={3}
            onChange={(e) => { setNotice(e.target.value); setNoticeEdited(true); }}
            className="w-full resize-none rounded-xl border border-night-borderLight bg-night-surface p-3.5 text-sm leading-relaxed text-fog-headline focus:border-mercury focus:ring-0"
          />
        </label>

        <p className="flex items-start gap-2 rounded-xl border border-amberAccent/30 bg-amberAccent/10 p-3 text-[11px] text-amber-200">
          <i className="fa-solid fa-triangle-exclamation mt-0.5" />{t.warning}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button type="button" onClick={onClose} className="h-12 rounded-xl border border-night-borderLight text-sm font-semibold text-fog-sub hover:text-white">{t.cancel}</button>
        <button type="button" onClick={submit} disabled={busy} className="h-12 rounded-xl bg-mercury text-sm font-bold text-white hover:bg-mercury-light disabled:opacity-50">{t.confirm}</button>
      </div>
    </Modal>
  );
};

export default PollCloseDialog;
