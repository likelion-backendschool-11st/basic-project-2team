import React, { useState } from 'react';
import { commentText, reportReasons } from '../../data/commentData';
import Modal from '../ui/Modal';

interface ReportDialogProps {
  readonly isOpen: boolean;
  readonly onConfirm: () => void;
  readonly onClose: () => void;
}

export const ReportDialog: React.FC<ReportDialogProps> = ({ isOpen, onConfirm, onClose }) => {
  const [reason, setReason] = useState<string | null>(null);
  const d = commentText.reportDialog;
  const close = () => { setReason(null); onClose(); };
  return (
    <Modal isOpen={isOpen} onClose={close} ariaLabel={d.title}>
      <h2 className="text-lg font-bold text-white flex items-center gap-2"><i className="fa-solid fa-flag text-roseAccent" />{d.title}</h2>
      <p className="text-sm text-fog-sub mt-2">{d.description}</p>
      <div className="mt-4 flex flex-col gap-2">
        {reportReasons.map((r) => (
          <label key={r} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm cursor-pointer ${reason === r ? 'border-roseAccent/60 bg-roseAccent/10 text-white' : 'border-night-borderLight text-fog-sub hover:border-night-hover'}`}>
            <input type="radio" name="report-reason" className="sr-only" checked={reason === r} onChange={() => setReason(r)} />
            <span className={`w-3.5 h-3.5 rounded-full border-2 ${reason === r ? 'border-roseAccent bg-roseAccent' : 'border-night-borderLight'}`} />{r}
          </label>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button type="button" onClick={close} className="h-12 rounded-xl border border-night-borderLight text-sm font-semibold text-fog-sub hover:text-white">{d.cancel}</button>
        <button type="button" disabled={!reason} onClick={() => { setReason(null); onConfirm(); }} className="h-12 rounded-xl bg-roseAccent text-sm font-bold text-white disabled:opacity-40 disabled:pointer-events-none">{d.confirm}</button>
      </div>
    </Modal>
  );
};

export default ReportDialog;
