import React from 'react';

interface InfoNoteProps {
  readonly text: string;
}

export const InfoNote: React.FC<InfoNoteProps> = ({ text }) => (
  <div className="flex items-center gap-1 text-fog-muted text-xs bg-night-surface/60 px-2 py-0.5 rounded-md">
    <i className="fa-solid fa-circle-info text-[12px]" />
    <span>{text}</span>
  </div>
);

export default InfoNote;
