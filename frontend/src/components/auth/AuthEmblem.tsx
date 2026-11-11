import React from 'react';

interface AuthEmblemProps {
  readonly icon: string;
  /** circle = login hero emblem, tile = recovery card emblem. */
  readonly variant?: 'circle' | 'tile';
}

export const AuthEmblem: React.FC<AuthEmblemProps> = ({ icon, variant = 'tile' }) =>
  variant === 'circle' ? (
    <div className="w-14 h-14 rounded-full bg-mercury/15 flex items-center justify-center text-periwinkle shadow-glow-mercury">
      <i className={`${icon} text-2xl`} />
    </div>
  ) : (
    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-night-card border border-night-borderLight shadow-inner">
      <i className={`${icon} text-2xl text-mercury-light`} />
    </div>
  );

export default AuthEmblem;
