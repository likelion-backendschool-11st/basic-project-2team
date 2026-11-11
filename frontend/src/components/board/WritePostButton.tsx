import React from 'react';
import { Link } from 'react-router-dom';
import { boardRoutes, boardText } from '../../data/boardData';

interface WritePostButtonProps {
  readonly to?: string;
  readonly label?: string;
}

export const WritePostButton: React.FC<WritePostButtonProps> = ({ to = boardRoutes.write, label = boardText.write }) => (
  <div className="w-full sm:w-auto">
    <Link
      to={to}
      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-mercury hover:bg-mercury-dark text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-mercury/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
    >
      <i className="fa-solid fa-pen-to-square text-xs" />
      <span>{label}</span>
    </Link>
  </div>
);

export default WritePostButton;
