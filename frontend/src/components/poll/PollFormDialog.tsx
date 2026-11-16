import React from 'react';
import type { PollInput, PollResponse } from '../../api/pollApi';
import { POLL_DESCRIPTION_MAX, POLL_OPTION_MAX, POLL_TITLE_MAX, pollText, type PollDeadline } from '../../data/pollData';
import { usePollForm } from '../../hooks/usePollForm';
import Modal from '../ui/Modal';

interface PollFormDialogProps {
  /** 편집할 투표. null 이면 새로 만듭니다. */
  readonly editing: PollResponse | null;
  /** 공고 출발 시각(ISO) — 「출발 n분 전 마감」 선택지 계산용 */
  readonly scheduleAt: string | null;
  readonly busy: boolean;
  readonly onSubmit: (input: PollInput) => void;
  readonly onClose: () => void;
}

const label = 'flex items-center gap-1 text-xs font-semibold text-fog-sub';
const field = 'w-full rounded-xl border border-night-borderLight bg-night-base px-3.5 py-2.5 text-sm text-fog-headline placeholder:text-fog-muted focus:border-mercury focus:ring-0';
const counter = 'font-mono text-[11px] text-fog-muted';
const check = 'rounded border-night-borderLight bg-night-card text-mercury focus:ring-mercury';

/** Stitch 「파티 의견 조율 투표 생성」(_4) · 「투표 옵션 편집」(_2) 모달. 열 때마다 새로 마운트해 폼을 초기화합니다. */
export const PollFormDialog: React.FC<PollFormDialogProps> = ({ editing, scheduleAt, busy, onSubmit, onClose }) => {
  const t = pollText.form;
  const f = usePollForm(editing, scheduleAt);
  const submit = () => {
    const input = f.toInput();
    if (input) onSubmit(input);
  };
  const error = (message: string | null | undefined) => (message ? <p className="mt-1 text-[11px] text-rose-300">{message}</p> : null);

  return (
    <Modal isOpen onClose={onClose} ariaLabel={editing ? t.editTitle : t.createTitle} widthClass="max-w-xl">
      <div className="-mx-7 -mt-7 mb-5 flex items-start justify-between gap-3 border-b border-night-borderLight bg-night-card/60 px-7 py-5 rounded-t-3xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mercury text-white"><i className={`fa-solid ${editing ? 'fa-sliders' : 'fa-square-poll-vertical'}`} /></div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold tracking-tight text-white">{editing ? t.editTitle : t.createTitle}</h2>
              <span className="rounded-full border border-amberAccent/30 bg-amberAccent/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">👑 {editing ? t.editBadge : t.createBadge}</span>
            </div>
            <p className="mt-0.5 text-xs text-fog-muted">{editing ? t.editDescription : t.createDescription}</p>
          </div>
        </div>
        <button type="button" aria-label={t.cancel} onClick={onClose} className="text-fog-sub hover:text-white"><i className="fa-solid fa-xmark" /></button>
      </div>

      <div className="flex max-h-[60vh] flex-col gap-5 overflow-y-auto pr-1">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="poll-title" className={label}>{t.title}<span className="text-roseAccent">*</span></label>
            <span className={counter}><strong className="text-fog-sub">{Array.from(f.title).length}</strong>/{POLL_TITLE_MAX}자</span>
          </div>
          <input id="poll-title" value={f.title} maxLength={POLL_TITLE_MAX} placeholder={t.titlePlaceholder} onChange={(e) => f.setTitle(e.target.value)} className={field} />
          {error(f.errors?.title)}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="poll-description" className={label}>{t.description}</label>
            <span className={counter}>{Array.from(f.description).length}/{POLL_DESCRIPTION_MAX}자</span>
          </div>
          <input id="poll-description" value={f.description} maxLength={POLL_DESCRIPTION_MAX} placeholder={t.descriptionPlaceholder} onChange={(e) => f.setDescription(e.target.value)} className={field} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <fieldset>
            <legend className={`${label} mb-2`}>{t.choiceType}</legend>
            <div className="grid grid-cols-2 gap-2">
              {[false, true].map((multi) => (
                <label key={String(multi)} className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold ${f.multiple === multi ? 'border-mercury bg-mercury/15 text-white' : 'border-night-borderLight text-fog-sub hover:border-fog-muted'}`}>
                  <input type="radio" name="poll-type" className="sr-only" checked={f.multiple === multi} onChange={() => f.setMultiple(multi)} />
                  {multi ? pollText.multiple : pollText.single}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="poll-deadline" className={`${label} mb-2`}>{t.deadline}</label>
            <select id="poll-deadline" value={f.deadline} onChange={(e) => f.setDeadline(e.target.value as PollDeadline)} className={field}>
              {f.choices.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            {f.deadline === 'custom' && (
              <input type="datetime-local" aria-label={pollText.deadlines.custom} value={f.custom} onChange={(e) => f.setCustom(e.target.value)} className={`${field} mt-2 [color-scheme:dark]`} />
            )}
            {error(f.errors?.deadline)}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className={label}>{t.options}<span className="font-normal text-fog-muted">{t.optionsRule}</span></span>
            <span className="text-[11px] font-semibold text-indigo-200">{t.optionsCount(f.options.length)}</span>
          </div>
          <div className="flex flex-col gap-2">
            {f.options.map((option, index) => (
              <div key={option.key} className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-night-card font-mono text-xs font-bold text-fog-sub">{index + 1}</span>
                <input value={option.label} maxLength={POLL_OPTION_MAX} placeholder={t.optionPlaceholder} aria-label={`${t.options} ${index + 1}`} onChange={(e) => f.setOption(option.key, e.target.value)} className={field} />
                <button type="button" title={t.removeOption} aria-label={t.removeOption} disabled={!f.canRemove} onClick={() => f.removeOption(option.key)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-fog-muted hover:bg-roseAccent/10 hover:text-roseAccent disabled:pointer-events-none disabled:opacity-30"><i className="fa-regular fa-trash-can" /></button>
              </div>
            ))}
          </div>
          {error(f.errors?.options)}
          {f.canAdd && (
            <button type="button" onClick={f.addOption} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-mercury/40 py-2.5 text-xs font-semibold text-indigo-200 hover:bg-mercury/10">
              <i className="fa-solid fa-plus" />{t.addOption(f.options.length)}
            </button>
          )}
        </div>

        <div>
          <span className={`${label} mb-2`}>{t.extra}</span>
          <div className="flex flex-col gap-2 rounded-xl border border-night-borderLight bg-night-base p-3.5 text-xs text-fog-sub">
            <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" className={check} checked={f.commentersOnly} onChange={(e) => f.setCommentersOnly(e.target.checked)} />{t.commentersOnly}</label>
            <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" className={check} checked={f.pinned} onChange={(e) => f.setPinned(e.target.checked)} />{editing ? t.pinnedEdit : t.pinned}</label>
          </div>
          {editing && <p className="mt-2 flex items-center gap-1.5 text-[11px] text-fog-muted"><i className="fa-solid fa-circle-info text-mercury-light" />{t.editNote}</p>}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-xl border border-night-borderLight px-5 py-2.5 text-xs font-semibold text-fog-sub hover:text-white">{t.cancel}</button>
        <button type="button" onClick={submit} disabled={busy} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-mercury to-mercury-dark px-5 py-2.5 text-xs font-bold text-white shadow-glow-mercury hover:brightness-110 disabled:opacity-50">
          <i className={`fa-solid ${editing ? 'fa-floppy-disk' : 'fa-check-to-slot'}`} />{editing ? t.save : t.create}
        </button>
      </div>
    </Modal>
  );
};

export default PollFormDialog;
