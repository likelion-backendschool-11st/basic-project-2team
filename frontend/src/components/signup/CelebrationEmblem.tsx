import React from 'react';

interface CelebrationEmblemProps {
  readonly className?: string;
}

export const CelebrationEmblem: React.FC<CelebrationEmblemProps> = ({ className = '' }) => (
  <div className={`relative mb-6 flex items-center justify-center ${className}`}>
    <div className="absolute inset-0 bg-mercury/30 blur-2xl rounded-full scale-150" />
    <div className="relative w-24 h-24 rounded-full bg-gradient-to-b from-night-hover via-night-base to-night-deep flex items-center justify-center shadow-glow-mercury">
      <div className="w-20 h-20 rounded-full bg-night-surface flex items-center justify-center">
        <i className="fa-solid fa-champagne-glasses text-[36px] text-indigo-200" />
      </div>
      <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-indigo-200 flex items-center justify-center shadow-md animate-bounce">
        <i className="fa-solid fa-star text-indigo-900 text-[11px]" />
      </div>
      <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-blue-900 flex items-center justify-center">
        <i className="fa-solid fa-gamepad text-periwinkle text-[9px]" />
      </div>
    </div>
  </div>
);

export default CelebrationEmblem;
