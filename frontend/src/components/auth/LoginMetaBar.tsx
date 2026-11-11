import React from 'react';

interface LoginMetaBarProps {
  readonly securityIcon: string;
  readonly security: string;
  readonly onlineCount: string;
  readonly onlineSuffix: string;
}

/** SSL notice + live concurrent-user count below the login card. */
export const LoginMetaBar: React.FC<LoginMetaBarProps> = ({ securityIcon, security, onlineCount, onlineSuffix }) => (
  <div className="w-full mt-6 flex items-center justify-between px-4 text-fog-muted text-xs">
    <div className="flex items-center gap-1">
      <i className={`${securityIcon} text-sm text-periwinkle/70`} />
      <span>{security}</span>
    </div>
    <div className="flex items-center gap-1">
      <span className="w-2 h-2 rounded-full bg-periwinkle/60 inline-block animate-pulse" />
      <span className="text-fog-sub font-medium">{onlineCount}</span>
      <span>{onlineSuffix}</span>
    </div>
  </div>
);

export default LoginMetaBar;
