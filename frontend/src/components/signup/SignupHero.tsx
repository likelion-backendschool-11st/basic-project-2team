import React from 'react';

interface SignupHeroProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly subtitle: string;
}

export const SignupHero: React.FC<SignupHeroProps> = ({ eyebrow, title, subtitle }) => (
  <div className="text-center mb-8">
    <div className="inline-flex items-center gap-1 px-4 py-1 rounded-full bg-night-card/60 backdrop-blur-md mb-4 shadow-sm">
      <i className="fa-solid fa-user-check text-[14px] text-indigo-200" />
      <span className="text-xs font-medium text-periwinkle uppercase tracking-widest">{eyebrow}</span>
    </div>
    <h1 className="text-3xl md:text-[42px] md:leading-[48px] text-fog-headline font-extrabold tracking-tight">{title}</h1>
    <p className="text-base text-fog-sub mt-1">{subtitle}</p>
  </div>
);

export default SignupHero;
