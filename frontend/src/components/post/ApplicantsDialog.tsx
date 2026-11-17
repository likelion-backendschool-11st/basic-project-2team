import React from 'react';
import Modal from '../ui/Modal';
import type { Applicant } from '../../hooks/usePostDetail';
import { Avatar } from '../ui/Avatar';
import ProfileLink from '../ui/ProfileLink';
import { postText as t } from '../../data/postData';

interface ApplicantsDialogProps {
  readonly isOpen: boolean;
  readonly applicants: readonly Applicant[];
  readonly onResolve: (applicant: Applicant, accepted: boolean) => void;
  readonly onClose: () => void;
}

const chip = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold';

/** 신청자 한 명: 닉네임 · 매너 온도 · (레벨 · 포지션 · 메시지) · 대표 평가 태그 + 승인/거절 */
const ApplicantItem: React.FC<{ readonly applicant: Applicant; readonly onResolve: ApplicantsDialogProps['onResolve'] }> = ({ applicant: a, onResolve }) => (
  <li className="flex items-start justify-between gap-3 rounded-xl bg-night-base/60 p-3">
    <div className="flex items-start gap-3 min-w-0">
      <ProfileLink memberId={a.memberId} ariaLabel={`${a.name} ${t.viewProfile}`} className="shrink-0 rounded-full hover:ring-2 hover:ring-mercury/50">
        <Avatar url={a.avatarUrl} name={a.name} className="w-10 h-10 rounded-full bg-night-card flex items-center justify-center text-sm font-bold text-white" />
      </ProfileLink>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <ProfileLink memberId={a.memberId} className="text-sm font-semibold text-white truncate">{a.name}</ProfileLink>
          <span className={`${chip} border border-emeraldAccent/30 bg-emeraldAccent/15 text-emerald-300`}>
            <i className="fa-solid fa-temperature-half text-[9px]" />
            {t.applicantMannerTemp(a.mannerTemp)}
          </span>
          <span className="text-[10px] text-fog-muted">{t.applicantReviewCount(a.reviewCount)}</span>
        </div>
        <div className="text-xs text-fog-muted mt-0.5 break-all">{a.spec}</div>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {a.topTags.length === 0 ? (
            <span className="text-[10px] text-fog-muted">{t.applicantNoTags}</span>
          ) : (
            a.topTags.map((tag) => (
              <span key={tag} className={`${chip} border border-mercury/40 bg-mercury/10 text-indigo-200`}>{tag}</span>
            ))
          )}
        </div>
      </div>
    </div>
    <div className="flex shrink-0 gap-2 text-xs">
      <button type="button" onClick={() => onResolve(a, false)} className="px-3 py-1.5 rounded-lg border border-night-borderLight text-fog-sub hover:text-white">거절</button>
      <button type="button" onClick={() => onResolve(a, true)} className="px-3 py-1.5 rounded-lg bg-mercury text-white font-semibold">승인</button>
    </div>
  </li>
);

export const ApplicantsDialog: React.FC<ApplicantsDialogProps> = ({ isOpen, applicants, onResolve, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} ariaLabel="신청자 목록" widthClass="max-w-lg">
    <h2 className="text-lg font-bold text-white mb-4">{t.manageApplicants}</h2>
    {applicants.length === 0 ? (
      <p className="text-sm text-fog-muted py-6 text-center">대기 중인 신청자가 없습니다.</p>
    ) : (
      <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
        {applicants.map((a) => (
          <ApplicantItem key={a.id} applicant={a} onResolve={onResolve} />
        ))}
      </ul>
    )}
    <button type="button" onClick={onClose} className="mt-5 w-full h-11 rounded-xl border border-night-borderLight text-sm text-fog-sub hover:text-white">닫기</button>
  </Modal>
);

export default ApplicantsDialog;
