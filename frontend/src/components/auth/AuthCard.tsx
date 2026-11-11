import React from 'react';

interface AuthCardProps {
  readonly children: React.ReactNode;
  /** hero = login card (soft strip, roomy padding); recovery = bordered card with bright strip. */
  readonly variant?: 'hero' | 'recovery';
}

export const AuthCard: React.FC<AuthCardProps> = ({ children, variant = 'recovery' }) =>
  variant === 'hero' ? (
    <div className="w-full bg-night-surface rounded-2xl p-8 md:p-12 shadow-card-subtle relative backdrop-blur-md">
      <div
        aria-hidden="true"
        className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-periwinkle/40 to-transparent rounded-full pointer-events-none"
      />
      {children}
    </div>
  ) : (
    <div className="w-full bg-night-surface/90 border border-night-borderLight rounded-2xl p-7 sm:p-9 shadow-glow-mercury backdrop-blur-xl relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-mercury to-transparent opacity-80"
      />
      {children}
    </div>
  );

export default AuthCard;
