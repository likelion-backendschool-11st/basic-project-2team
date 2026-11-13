import React from 'react';
import { Link } from 'react-router-dom';
import { authLinks } from '../../data/layoutData';
import { useAuth } from '../../hooks/useAuth';
import UserHeaderSlot from '../user/UserHeaderSlot';

/** 로그인 상태면 사용자 메뉴, 아니면 로그인/회원가입 버튼을 보여줍니다. */
export const AuthActions: React.FC = () => {
  const { user } = useAuth();
  return (
  <div className="flex items-center gap-3">
    {user ? (
      <UserHeaderSlot user={user} />
    ) : (
      <div className="flex items-center bg-night-surface border border-night-borderLight rounded-full p-1 shadow-inner">
        <Link
          to={authLinks.login.to}
          className="px-4 py-1.5 text-xs md:text-sm font-semibold text-fog-headline hover:text-white transition-colors duration-150 rounded-full hover:bg-white/10"
        >
          {authLinks.login.label}
        </Link>
        <span className="text-night-borderLight text-xs select-none">|</span>
        <Link
          to={authLinks.signup.to}
          className="px-4 py-1.5 text-xs md:text-sm font-bold text-white bg-mercury hover:bg-mercury-light transition-all duration-200 rounded-full shadow-md shadow-mercury/30"
        >
          {authLinks.signup.label}
        </Link>
      </div>
    )}
  </div>
  );
};

export default AuthActions;
