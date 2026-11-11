import React from 'react';

export type FieldStatusTone = 'hint' | 'error' | 'success';

interface FieldStatusMessageProps {
  readonly tone: FieldStatusTone;
  readonly message: string;
}

interface ToneStyle {
  readonly icon: string;
  readonly iconClass: string;
  readonly textClass: string;
}

const toneStyles: Readonly<Record<FieldStatusTone, ToneStyle>> = {
  hint: { icon: 'fa-regular fa-lightbulb', iconClass: 'text-amber-300', textClass: 'text-amber-200/90' },
  error: { icon: 'fa-solid fa-circle-xmark', iconClass: 'text-rose-300', textClass: 'text-rose-300' },
  success: { icon: 'fa-solid fa-circle-check', iconClass: 'text-indigo-200', textClass: 'text-indigo-200' },
};

export const FieldStatusMessage: React.FC<FieldStatusMessageProps> = ({ tone, message }) => {
  const style = toneStyles[tone];
  return (
    <div className="flex items-center gap-1.5" role={tone === 'error' ? 'alert' : undefined}>
      <i className={`${style.icon} text-[14px] ${style.iconClass}`} />
      <span className={`text-xs font-medium ${style.textClass}`}>{message}</span>
    </div>
  );
};

export default FieldStatusMessage;
