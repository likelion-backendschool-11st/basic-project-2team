import React from 'react';
import { Link } from 'react-router-dom';

interface PanelCardProps {
  readonly title: string;
  /** Leading marker: small dot (pulse/ping) or icon chip. */
  readonly marker?: React.ReactNode;
  /** Right side of header: "더보기" link or badge. */
  readonly moreLink?: { readonly label: string; readonly to: string };
  readonly badge?: string;
  readonly children: React.ReactNode;
}

export const PanelCard: React.FC<PanelCardProps> = ({ title, marker, moreLink, badge, children }) => (
  <div className="bg-night-surface border border-night-border rounded-2xl p-4 lg:p-5 flex flex-col gap-4 shadow-card-subtle">
    <div className="flex items-center justify-between pb-3 border-b border-night-border">
      <div className="flex items-center gap-2">
        {marker}
        <h2 className="text-base font-bold text-fog-headline tracking-tight flex items-center gap-1.5">{title}</h2>
      </div>
      {moreLink && (
        <Link to={moreLink.to} className="text-xs text-fog-muted hover:text-mercury-light transition-colors flex items-center gap-1 font-medium">
          {moreLink.label} <i className="fa-solid fa-chevron-right text-[10px]" />
        </Link>
      )}
      {badge && <span className="text-[10px] text-fog-muted px-2 py-0.5 rounded bg-night-card">{badge}</span>}
    </div>
    <div className="space-y-3">{children}</div>
  </div>
);

export default PanelCard;
