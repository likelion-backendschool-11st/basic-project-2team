import React from 'react';

interface VerifyButtonProps {
  readonly label: string;
  readonly verifiedLabel: string;
  readonly verified: boolean;
  readonly onVerify: () => void;
  /** neutral = find-id style (grey), accent = find-password style (outlined mercury). */
  readonly tone?: 'neutral' | 'accent';
}

export const VerifyButton: React.FC<VerifyButtonProps> = ({ label, verifiedLabel, verified, onVerify, tone = 'neutral' }) => {
  const idle =
    tone === 'accent'
      ? 'text-xs font-semibold bg-night-base border-mercury/40 text-mercury-light hover:bg-mercury/10 hover:border-mercury active:scale-95'
      : 'text-sm font-medium bg-night-card border-night-borderLight text-fog-headline hover:bg-night-hover hover:border-fog-muted';
  const done =
    tone === 'accent'
      ? 'text-xs font-semibold bg-night-base border-emeraldAccent/40 text-emeraldAccent'
      : 'text-sm font-medium bg-emeraldAccent/10 border-emeraldAccent/50 text-emeraldAccent';
  return (
    <button
      className={`px-4 py-2.5 border rounded-xl whitespace-nowrap transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-mercury/50 ${
        verified ? done : idle
      }`}
      disabled={verified}
      onClick={onVerify}
      type="button"
    >
      {verified ? (
        <>
          <i className="fa-solid fa-check mr-1" />
          {verifiedLabel}
        </>
      ) : (
        label
      )}
    </button>
  );
};

export default VerifyButton;
