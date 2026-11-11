import React from 'react';

interface StatusPillProps {
  readonly label: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ label }) => (
  <div className="inline-flex items-center gap-1 px-4 py-1 rounded-full bg-mercury/15 text-indigo-200 mb-4">
    <span className="w-1.5 h-1.5 rounded-full bg-indigo-200 animate-pulse" />
    <span className="text-sm tracking-wider uppercase font-semibold">{label}</span>
  </div>
);

export default StatusPill;
