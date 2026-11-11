import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '../layout/BrandLogo';
import { writeText } from '../../data/writeData';
import { ROUTES } from '../../data/routes';

interface WriteTopBarProps {
  readonly savedAt: string;
  readonly onDraft: () => void;
  readonly onLeave: () => void;
}

export const WriteTopBar: React.FC<WriteTopBarProps> = ({ savedAt, onDraft, onLeave }) => (
  <header className="sticky top-0 z-40 border-b border-night-borderLight bg-night-base/95 backdrop-blur-md px-6 py-3">
    <div className="max-w-[1520px] mx-auto flex items-center justify-between gap-4">
      <div className="flex items-center gap-5">
        <BrandLogo />
        <nav className="hidden md:flex items-center gap-3 text-sm pl-5 border-l border-night-borderLight">
          <Link to={ROUTES.board} className="text-fog-sub hover:text-white">{writeText.crumbRoot}</Link>
          <i className="fa-solid fa-chevron-right text-[10px] text-fog-muted" />
          <span className="font-bold text-white flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-mercury" />{writeText.crumbCurrent}</span>
        </nav>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="hidden sm:flex items-center gap-1.5 text-emerald-300"><i className="fa-solid fa-check" />{writeText.draftSaved(savedAt)}</span>
        <button type="button" onClick={onDraft} className="px-3.5 py-1.5 rounded-lg border border-night-borderLight text-fog-headline hover:bg-white/5">{writeText.draftButton}</button>
        <button type="button" onClick={onLeave} className="px-3 py-1.5 text-fog-sub hover:text-white flex items-center gap-1.5"><i className="fa-solid fa-xmark" />{writeText.leave}</button>
      </div>
    </div>
  </header>
);

export default WriteTopBar;
