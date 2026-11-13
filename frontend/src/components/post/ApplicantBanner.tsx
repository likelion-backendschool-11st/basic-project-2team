import React from 'react';
import { postText } from '../../data/postData';

interface ApplicantBannerProps {
  readonly count: number;
  /** 대기 중인 신청자 닉네임(오래된 순) */
  readonly names: readonly string[];
  readonly onManage: () => void;
}

export const ApplicantBanner: React.FC<ApplicantBannerProps> = ({ count, names, onManage }) => (
  <section className="rounded-2xl border border-mercury/30 bg-mercury/10 p-5 flex flex-wrap items-center justify-between gap-4">
    <div className="flex items-center gap-4">
      <span className="relative w-11 h-11 rounded-xl bg-night-card flex items-center justify-center text-mercury-light"><i className="fa-regular fa-bell" /><span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-roseAccent text-[10px] text-white flex items-center justify-center">{count}</span></span>
      <div><div className="font-bold text-white text-sm">{postText.waiting(count)} <span className="text-[10px] ml-1 px-1.5 py-0.5 rounded bg-mercury/30 text-indigo-200">{postText.waitingTag}</span></div><div className="text-xs text-fog-sub mt-0.5">{postText.waitingNote(names)}</div></div>
    </div>
    <button type="button" onClick={onManage} className="px-4 py-2.5 rounded-xl bg-mercury hover:bg-mercury-light text-xs font-bold text-white"><i className="fa-solid fa-users mr-1.5" />{postText.manageApplicants}</button>
  </section>
);

export default ApplicantBanner;
