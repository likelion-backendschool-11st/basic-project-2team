import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { brand, footerLinks, levelUpText, levelUpTips } from '../../data/layoutData';

interface FooterProps {
  readonly className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className = '' }) => (
  <footer className={`mt-auto border-t border-night-border bg-night-deep py-6 px-6 text-xs text-fog-muted ${className}`}>
    <div className="max-w-[1520px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-5">
      <div className="flex items-center gap-2.5 lg:flex-1">
        <BrandLogo size="sm" />
        <span className="text-[11px] text-fog-muted ml-2">{brand.copyright}</span>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-mercury-light">
          <i className="fa-solid fa-arrow-trend-up" />
          {levelUpText.title}
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5">
          {levelUpTips.map((tip) => (
            <span key={tip.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-night-borderLight bg-night-base/60">
              <i className={`fa-solid ${tip.icon} w-3.5 text-center text-mercury-light`} />
              <span className="font-semibold text-fog-headline">{tip.label}</span>
              <span className="font-bold text-emeraldAccent">{tip.exp}</span>
              <span className="text-fog-muted">· {tip.quip}</span>
            </span>
          ))}
        </div>
        <span className="text-[11px] text-fog-muted">{levelUpText.formula}</span>
      </div>

      <div className="flex items-center justify-end gap-3 sm:gap-4 text-xs text-fog-sub lg:flex-1">
        {footerLinks.map((link, i) => (
          <React.Fragment key={link.label}>
            {i > 0 && <span className="text-night-borderLight">•</span>}
            <Link className="hover:text-white transition-colors" to={link.to}>
              {link.label}
            </Link>
          </React.Fragment>
        ))}
      </div>
    </div>
  </footer>
);

export default Footer;
