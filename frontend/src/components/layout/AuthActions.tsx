import React from 'react';
import { Link } from 'react-router-dom';
import { authLinks } from '../../data/layoutData';

interface AuthActionsProps {
  /** Optional slot for logged-in UI; when given, replaces login/signup pills. */
  readonly children?: React.ReactNode;
}

export const AuthActions: React.FC<AuthActionsProps> = ({ children }) => (
  <div className="flex items-center gap-3">
    {children ?? (
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

export default AuthActions;
