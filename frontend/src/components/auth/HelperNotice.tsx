import React from 'react';

interface HelperNoticeProps {
  readonly children: React.ReactNode;
}

/** Amber "💡" guidance line under the email row. */
export const HelperNotice: React.FC<HelperNoticeProps> = ({ children }) => (
  <div className="mt-2 flex items-center gap-1.5 text-xs text-amberAccent/90 font-medium tracking-tight">
    <span aria-hidden="true">💡</span>
    <p>{children}</p>
  </div>
);

export default HelperNotice;
