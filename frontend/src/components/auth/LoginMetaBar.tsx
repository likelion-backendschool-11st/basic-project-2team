import React from 'react';

interface LoginMetaBarProps {
  readonly securityIcon: string;
  readonly security: string;
}

/** SSL notice below the login card. */
export const LoginMetaBar: React.FC<LoginMetaBarProps> = ({ securityIcon, security }) => (
  <div className="w-full mt-6 flex items-center justify-between px-4 text-fog-muted text-xs">
    <div className="flex items-center gap-1">
      <i className={`${securityIcon} text-sm text-periwinkle/70`} />
      <span>{security}</span>
    </div>
  </div>
);

export default LoginMetaBar;
