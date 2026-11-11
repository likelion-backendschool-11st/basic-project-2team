import React from 'react';
import { Link } from 'react-router-dom';
import { homeText } from '../../data/homeData';
import { ROUTES } from '../../data/routes';

interface QuickFilterBoxProps {
  readonly filters: readonly string[];
}

export const QuickFilterBox: React.FC<QuickFilterBoxProps> = ({ filters }) => (
  <div className="mt-6 pt-5 border-t border-night-border px-1">
    <div className="bg-night-card/60 p-3.5 rounded-xl border border-white/[0.04]">
      <p className="text-[11px] text-fog-muted mb-2 font-medium">{homeText.quickFilterTitle}</p>
      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <Link
            key={f}
            to={`${ROUTES.search}?q=${encodeURIComponent(f.replace('#', ''))}`}
            className="text-[11px] px-2 py-1 rounded-md bg-night-base text-fog-sub border border-night-border hover:border-mercury/50 hover:text-white"
          >
            {f}
          </Link>
        ))}
      </div>
    </div>
  </div>
);

export default QuickFilterBox;
