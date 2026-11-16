import React, { useState } from 'react';
import { commentText, reportReasons as defaultReasons } from '../../data/commentData';
import Modal from '../ui/Modal';

interface ReportDialogProps {
  readonly isOpen: boolean;
  /** 제목 (기본: 댓글 신고) */
  readonly title?: string;
  /** 안내 문구 (기본: 댓글 신고 안내) */
  readonly description?: string;
  /** 고를 수 있는 사유 (기본: 댓글·공고·회원 신고 사유) */
  readonly reasons?: readonly string[];
  /** 선택한 사유와 상세 내용(선택, 비어 있을 수 있음) */
  readonly onConfirm: (reason: string, detail: string) => void;
  readonly onClose: () => void;
}

export const ReportDialog: React.FC<ReportDialogProps> = ({ isOpen, title, description, reasons = defaultReasons, onConfirm, onClose }) => {
  const [reason, setReason] = useState<string | null>(null);
  const [detail, setDetail] = useState('');
  const d = commentText.reportDialog;
  const reset = () => { setReason(null); setDetail(''); };
  const close = () => { reset(); onClose(); };
  const submit = () => {
    if (reason) onConfirm(reason, detail);
    reset();
  };
  return (
    <Modal isOpen={isOpen} onClose={close} ariaLabel={title ?? d.title}>
      <h2 className="text-lg font-bold text-white flex items-center gap-2"><i className="fa-solid fa-flag text-roseAccent" />{title ?? d.title}</h2>
      <p className="text-sm text-fog-sub mt-2">{description ?? d.description}</p>
      <div className="mt-4 flex flex-col gap-2">
        {reasons.map((r) => (
          <label key={r} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm cursor-pointer ${reason === r ? 'border-roseAccent/60 bg-roseAccent/10 text-white' : 'border-night-borderLight text-fog-sub hover:border-night-hover'}`}>
            <input type="radio" name="report-reason" className="sr-only" checked={reason === r} onChange={() => setReason(r)} />
            <span className={`w-3.5 h-3.5 rounded-full border-2 ${reason === r ? 'border-roseAccent bg-roseAccent' : 'border-night-borderLight'}`} />{r}
          </label>
        ))}
      </div>
      <label className="mt-4 block">
        <span className="text-xs font-semibold text-fog-sub">{d.detailLabel}</span>
        <textarea
          value={detail}
          maxLength={d.detailMax}
          rows={3}
          placeholder={d.detailPlaceholder}
          onChange={(e) => setDetail(e.target.value)}
          className="mt-2 w-full resize-none rounded-xl border border-night-borderLight bg-night-surface p-3 text-sm text-fog-headline placeholder:text-fog-muted focus:border-roseAccent/60 focus:ring-0"
        />
        <span className="block text-right text-[11px] font-mono text-fog-muted">{detail.length}/{d.detailMax}</span>
      </label>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button type="button" onClick={close} className="h-12 rounded-xl border border-night-borderLight text-sm font-semibold text-fog-sub hover:text-white">{d.cancel}</button>
        <button type="button" disabled={!reason} onClick={submit} className="h-12 rounded-xl bg-roseAccent text-sm font-bold text-white disabled:opacity-40 disabled:pointer-events-none">{d.confirm}</button>
      </div>
    </Modal>
  );
};

export default ReportDialog;
