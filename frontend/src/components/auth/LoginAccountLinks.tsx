import React from 'react';
import { Link } from 'react-router-dom';
import type { AuthLinkItem } from '../../data/authData';

interface LoginAccountLinksProps {
  readonly recoveryLinks: readonly AuthLinkItem[];
  readonly signupPrompt: string;
  readonly signupLink: AuthLinkItem;
}

/** 아이디 찾기 • 비밀번호 찾기 + 회원가입 prompt under the login form. */
export const LoginAccountLinks: React.FC<LoginAccountLinksProps> = ({ recoveryLinks, signupPrompt, signupLink }) => (
  <div className="flex flex-col items-center gap-2 mt-8 pt-6">
    <div className="flex items-center gap-2 text-sm">
      {recoveryLinks.map((link, i) => (
        <React.Fragment key={link.to}>
          {i > 0 && <span className="text-night-hover text-[11px]">•</span>}
          <Link className="text-fog-muted hover:text-periwinkle hover:underline transition-colors" to={link.to}>
            {link.label}
          </Link>
        </React.Fragment>
      ))}
    </div>
    <div className="flex items-center gap-1 text-sm text-fog-sub mt-1">
      <span>{signupPrompt}</span>
      <Link className="text-periwinkle hover:text-lavender font-medium hover:underline flex items-center gap-0.5" to={signupLink.to}>
        <span>{signupLink.label}</span>
        <i className="fa-solid fa-chevron-right text-[10px]" />
      </Link>
    </div>
  </div>
);

export default LoginAccountLinks;
