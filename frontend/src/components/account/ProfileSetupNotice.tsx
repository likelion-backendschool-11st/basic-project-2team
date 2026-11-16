import React from 'react';

interface ProfileSetupNoticeProps {
  readonly icon: string;
  readonly title: string;
  readonly body: string;
}

/** 프로필 수정 화면 상단 — 프로필을 처음 설정해야 하는 회원에게 보이는 안내 배너 */
export const ProfileSetupNotice: React.FC<ProfileSetupNoticeProps> = ({ icon, title, body }) => (
  <div role="status" className="flex items-start gap-3 rounded-2xl border border-mercury/30 bg-mercury/10 px-4 py-4">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mercury/20 text-mercury-light">
      <i className={icon} />
    </span>
    <div className="flex flex-col gap-1">
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="text-xs leading-relaxed text-fog-sub">{body}</p>
    </div>
  </div>
);

export default ProfileSetupNotice;
