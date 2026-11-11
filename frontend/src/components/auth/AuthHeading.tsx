import React from 'react';
import AuthEmblem from './AuthEmblem';

interface AuthHeadingProps {
  readonly icon: string;
  readonly title: string;
  readonly subtitle: string;
  /** hero = large standalone heading (login), card = compact heading inside a card. */
  readonly size?: 'hero' | 'card';
}

export const AuthHeading: React.FC<AuthHeadingProps> = ({ icon, title, subtitle, size = 'card' }) =>
  size === 'hero' ? (
    <div className="flex flex-col items-center text-center mb-8">
      <div className="mb-4">
        <AuthEmblem icon={icon} variant="circle" />
      </div>
      <h1 className="text-4xl md:text-[42px] md:leading-[48px] text-fog-headline tracking-tight mb-1 font-bold">{title}</h1>
      <p className="text-base text-fog-sub">{subtitle}</p>
    </div>
  ) : (
    <div className="text-center mb-6">
      <div className="mb-3">
        <AuthEmblem icon={icon} variant="tile" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-white mb-1">{title}</h1>
      <p className="text-xs text-fog-sub">{subtitle}</p>
    </div>
  );

export default AuthHeading;
