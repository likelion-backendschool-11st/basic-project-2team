import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { brand, footerLinks } from '../../data/layoutData';

interface FooterProps {
  readonly className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className = '' }) => (
  <footer className={`mt-auto border-t border-night-border bg-night-deep py-6 px-6 text-xs text-fog-muted ${className}`}>
    <div className="max-w-[1520px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <BrandLogo size="sm" />
        <span className="text-[11px] text-fog-muted ml-2">{brand.copyright}</span>
      </div>
      <div className="flex items-center gap-3 sm:gap-4 text-xs text-fog-sub">
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
