import React from 'react';
import { Link } from 'react-router-dom';
import { topNavItems } from '../../data/layoutData';
import { useActiveRoute } from '../../hooks/useActiveRoute';

interface TopNavProps {
  readonly className?: string;
}

export const TopNav: React.FC<TopNavProps> = ({ className = '' }) => {
  const { isActive } = useActiveRoute();
  return (
    <nav className={`hidden md:flex items-center gap-1.5 bg-night-surface border border-night-borderLight rounded-full p-1 shadow-inner backdrop-blur-md ${className}`}>
      {topNavItems.map((item) => (
        <Link
          key={item.label}
          to={item.to}
          className={
            isActive(item.to)
              ? 'px-3.5 py-1.5 text-xs md:text-sm font-bold text-white bg-mercury/30 border border-mercury/40 rounded-full transition-all duration-150 flex items-center gap-1.5'
              : 'px-3.5 py-1.5 text-xs md:text-sm font-semibold text-fog-headline hover:text-white hover:bg-white/10 rounded-full transition-all duration-150 flex items-center gap-1.5'
          }
        >
          <span>{item.label}</span>
          {item.dot && <span className="w-2 h-2 rounded-full bg-roseAccent" />}
        </Link>
      ))}
    </nav>
  );
};

export default TopNav;
