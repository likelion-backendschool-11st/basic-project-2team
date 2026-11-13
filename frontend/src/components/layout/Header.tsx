import React from 'react';
import BrandLogo from './BrandLogo';
import TopNav from './TopNav';
import AuthActions from './AuthActions';

interface HeaderProps {
  readonly showNav?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ showNav = true }) => (
  <header className="sticky top-0 z-50 border-b border-night-borderLight bg-night-base/95 backdrop-blur-md px-6 py-3.5 transition-all shadow-md">
    <div className="max-w-[1520px] mx-auto flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <BrandLogo />
      </div>
      {showNav && <TopNav />}
      <AuthActions />
    </div>
  </header>
);

export default Header;
