import React from 'react';
import { Link } from 'react-router-dom';
import { brand } from '../../data/layoutData';
import { ROUTES } from '../../data/routes';

interface BrandLogoProps {
  readonly size?: 'md' | 'sm';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md' }) => {
  if (size === 'sm') {
    return (
      <Link to={ROUTES.home} className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-mercury to-indigo-400 flex items-center justify-center shadow-sm text-white">
          <i className="fa-solid fa-gamepad text-xs" />
        </div>
        <span className="text-sm font-bold text-fog-headline tracking-tight">{brand.name}</span>
      </Link>
    );
  }
  return (
    <Link to={ROUTES.home} className="group flex items-center gap-2.5 text-white focus:outline-none">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-mercury to-indigo-400 flex items-center justify-center shadow-lg shadow-mercury/30 group-hover:scale-105 transition-transform duration-200">
        <i className="fa-solid fa-gamepad text-white text-lg" />
      </div>
      <div className="flex flex-col">
        <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1">
          {brand.name}
          <span className="w-1.5 h-1.5 rounded-full bg-mercury animate-pulse" />
        </span>
        <span className="text-[10px] tracking-wider uppercase text-fog-sub font-semibold">{brand.tagline}</span>
      </div>
    </Link>
  );
};

export default BrandLogo;
