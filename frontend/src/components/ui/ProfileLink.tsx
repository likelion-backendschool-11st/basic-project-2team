import React from 'react';
import { Link } from 'react-router-dom';
import { paths } from '../../data/routes';

interface ProfileLinkProps {
  /** 회원 id. 없으면(탈퇴한 회원 등) 링크 없이 글자만 보여줍니다. */
  readonly memberId: number | null | undefined;
  readonly className?: string;
  readonly ariaLabel?: string;
  readonly children: React.ReactNode;
}

/**
 * 닉네임·아바타를 누르면 회원 프로필 상세(/members/:memberId)로 이동합니다. 내 id 면 프로필 화면이 마이페이지로 보냅니다.
 * 카드처럼 눌러서 다른 곳으로 이동하는 부모 안에서도 쓸 수 있게 클릭이 부모로 번지지 않게 합니다.
 */
export const ProfileLink: React.FC<ProfileLinkProps> = ({ memberId, className = '', ariaLabel, children }) =>
  memberId === null || memberId === undefined ? (
    <span className={className}>{children}</span>
  ) : (
    <Link
      to={paths.memberProfile(memberId)}
      onClick={(e) => e.stopPropagation()}
      aria-label={ariaLabel}
      className={`${className} hover:text-mercury-light hover:underline`}
    >
      {children}
    </Link>
  );

export default ProfileLink;
