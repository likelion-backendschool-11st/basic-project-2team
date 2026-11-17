import React from 'react';
import { Link } from 'react-router-dom';
import { paths } from '../../data/routes';
import type { MannerMember } from '../../data/homeData';
import { avatarStyles, tagStyles } from '../../data/accentStyles';

interface MannerMemberCardProps {
  readonly member: MannerMember;
}

/** 4~6위 카드. 카드 어디를 눌러도 그 회원의 프로필 상세로 이동합니다. */
export const MannerMemberCard: React.FC<MannerMemberCardProps> = ({ member }) => (
  <Link
    to={paths.memberProfile(member.id)}
    aria-label={`${member.name} 프로필 보기`}
    className="group p-3 rounded-xl bg-night-card border border-white/[0.04] flex items-center justify-between hover:border-emeraldAccent/40 transition-colors"
  >
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${avatarStyles[member.accent]}`}>
        <i className={`fa-solid ${member.icon} text-base`} />
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-fog-headline group-hover:text-mercury-light group-hover:underline">{member.name}</span>
          <span className={`text-[10px] px-1.5 rounded font-semibold ${tagStyles[member.accent]}`}>{member.role}</span>
        </div>
        <p className="text-[11px] text-fog-muted">{member.comment}</p>
      </div>
    </div>
    <div className="text-right">
      <span className="text-xs font-semibold text-fog-sub">{member.praise}</span>
      <span className="block text-[10px] text-mercury-light font-bold">{member.mvp}</span>
    </div>
  </Link>
);

export default MannerMemberCard;
