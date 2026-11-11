import React from 'react';

interface SectionHeadingProps {
  readonly title: string;
  readonly hint?: string;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({ title, hint }) => (
  <div className="flex items-center justify-between pb-1">
    <span className="text-base font-semibold text-fog-headline flex items-center gap-1">
      <span className="w-1.5 h-4 bg-indigo-200 rounded-full inline-block" />
      {title}
    </span>
    {hint && <span className="text-xs text-fog-sub/70">{hint}</span>}
  </div>
);

export default SectionHeading;
