import React from 'react';

interface SecurityNoteProps {
  readonly text: string;
}

export const SecurityNote: React.FC<SecurityNoteProps> = ({ text }) => (
  <div className="relative mt-6 flex items-center gap-1 text-fog-sub text-xs text-center">
    <i className="fa-solid fa-shield-halved text-[12px] text-fog-muted" />
    <span>{text}</span>
  </div>
);

export default SecurityNote;
