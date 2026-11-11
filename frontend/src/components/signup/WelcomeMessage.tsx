import React from 'react';

interface WelcomeMessageProps {
  readonly title: string;
  readonly nickname: string;
  readonly suffix: string;
  readonly body: string;
}

export const WelcomeMessage: React.FC<WelcomeMessageProps> = ({ title, nickname, suffix, body }) => (
  <>
    <h1 className="text-3xl md:text-[42px] md:leading-[48px] text-fog-headline font-bold tracking-tight mb-2">{title}</h1>
    <div className="flex flex-col items-center gap-1 mb-6">
      <p className="text-2xl text-fog-headline">
        <span className="text-indigo-200 font-bold">{nickname}</span>
        {suffix}
      </p>
      <p className="text-base text-fog-sub">{body}</p>
    </div>
  </>
);

export default WelcomeMessage;
