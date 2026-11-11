import React from 'react';
import { Link } from 'react-router-dom';
import type { AuthLinkItem } from '../../data/authData';

interface AuthSecondaryLinksProps {
  readonly back: AuthLinkItem;
  readonly alt: AuthLinkItem;
}

/** Card footer row: "← 로그인으로 돌아가기" + alternate recovery link. */
export const AuthSecondaryLinks: React.FC<AuthSecondaryLinksProps> = ({ back, alt }) => (
  <nav
    aria-label="보조 네비게이션"
    className="mt-6 pt-5 border-t border-night-borderLight flex items-center justify-between text-xs text-fog-sub"
  >
    <Link className="hover:text-fog-headline transition-colors flex items-center gap-1" to={back.to}>
      <i className="fa-solid fa-arrow-left text-[10px]" />
      <span>{back.label}</span>
    </Link>
    <Link className="hover:text-mercury-light transition-colors" to={alt.to}>
      {alt.label}
    </Link>
  </nav>
);

export default AuthSecondaryLinks;
