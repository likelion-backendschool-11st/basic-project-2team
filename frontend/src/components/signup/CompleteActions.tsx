import React from 'react';
import { Link } from 'react-router-dom';

interface CompleteActionsProps {
  readonly loginLabel: string;
  readonly loginTo: string;
  readonly homeLabel: string;
  readonly homeTo: string;
}

export const CompleteActions: React.FC<CompleteActionsProps> = ({ loginLabel, loginTo, homeLabel, homeTo }) => (
  <div className="w-full flex flex-col items-center gap-4">
    <Link
      to={loginTo}
      className="w-full py-3.5 px-8 bg-mercury hover:bg-mercury/90 text-white text-base font-medium rounded-full shadow-glow-mercury hover:shadow-lg hover:shadow-mercury/40 transition-all flex items-center justify-center gap-2 group"
    >
      <span>{loginLabel}</span>
      <i className="fa-solid fa-right-to-bracket text-[15px] group-hover:translate-x-1 transition-transform" />
    </Link>
    <Link
      to={homeTo}
      className="text-sm text-fog-sub hover:text-fog-headline transition-colors py-1 px-4 flex items-center gap-1 group"
    >
      <span>{homeLabel}</span>
      <i className="fa-solid fa-chevron-right text-[11px] text-fog-muted group-hover:text-fog-headline group-hover:translate-x-0.5 transition-all" />
    </Link>
  </div>
);

export default CompleteActions;
