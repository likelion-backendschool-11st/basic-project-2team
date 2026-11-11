import React from 'react';
import Modal from '../ui/Modal';
import type { Applicant } from '../../hooks/usePostDetail';

interface ApplicantsDialogProps {
  readonly isOpen: boolean;
  readonly applicants: readonly Applicant[];
  readonly onResolve: (name: string, accepted: boolean) => void;
  readonly onClose: () => void;
}

export const ApplicantsDialog: React.FC<ApplicantsDialogProps> = ({ isOpen, applicants, onResolve, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} ariaLabel="신청자 목록" widthClass="max-w-lg">
    <h2 className="text-lg font-bold text-white mb-4">신청자 목록 관리 / 승인</h2>
    {applicants.length === 0 ? (
      <p className="text-sm text-fog-muted py-6 text-center">대기 중인 신청자가 없습니다.</p>
    ) : (
      <ul className="space-y-2">
        {applicants.map((a) => (
          <li key={a.name} className="flex items-center justify-between gap-3 rounded-xl bg-night-base/60 p-3">
            <div><div className="text-sm font-semibold text-white">{a.name}</div><div className="text-xs text-fog-muted">{a.spec}</div></div>
            <div className="flex gap-2 text-xs">
              <button type="button" onClick={() => onResolve(a.name, false)} className="px-3 py-1.5 rounded-lg border border-night-borderLight text-fog-sub hover:text-white">거절</button>
              <button type="button" onClick={() => onResolve(a.name, true)} className="px-3 py-1.5 rounded-lg bg-mercury text-white font-semibold">승인</button>
            </div>
          </li>
        ))}
      </ul>
    )}
    <button type="button" onClick={onClose} className="mt-5 w-full h-11 rounded-xl border border-night-borderLight text-sm text-fog-sub hover:text-white">닫기</button>
  </Modal>
);

export default ApplicantsDialog;
