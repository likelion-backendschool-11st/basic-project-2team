import React from 'react';

interface HighlightBannerProps {
  readonly text: string;
}

export const HighlightBanner: React.FC<HighlightBannerProps> = ({ text }) => (
  <div className="w-full bg-night-surface/70 rounded-2xl p-4 mb-8 flex items-center justify-center gap-2 shadow-inner">
    <i className="fa-solid fa-users text-periwinkle text-[16px]" />
    <p className="text-lg font-medium text-blue-100">{text}</p>
  </div>
);

export default HighlightBanner;
