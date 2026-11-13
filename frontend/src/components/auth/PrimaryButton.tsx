import React from 'react';

interface PrimaryButtonProps {
  readonly label: string;
  /** Font Awesome classes. */
  readonly icon?: string;
  readonly iconPosition?: 'leading' | 'trailing';
  /** pill = login CTA, rounded = recovery CTA. */
  readonly shape?: 'pill' | 'rounded';
  readonly type?: 'submit' | 'button';
  readonly onClick?: () => void;
  /** 요청 중 등 누를 수 없을 때 */
  readonly disabled?: boolean;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  label,
  icon,
  iconPosition = 'leading',
  shape = 'rounded',
  type = 'submit',
  onClick,
  disabled = false,
}) => {
  const iconEl = icon ? (
    <i className={`${icon} ${iconPosition === 'leading' ? 'text-xs opacity-80' : 'text-sm'}`} />
  ) : null;
  const shapeClass =
    shape === 'pill'
      ? 'h-12 rounded-full text-base gap-1 mt-1 shadow-lg shadow-mercury/30 hover:shadow-glow-mercury'
      : 'py-3 px-4 rounded-xl text-sm gap-2 shadow-lg shadow-mercury/30 hover:shadow-mercury-light/40';
  return (
    <button
      className={`w-full bg-mercury hover:bg-mercury-light text-white font-medium flex items-center justify-center transition-all duration-200 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-mercury focus:ring-offset-2 focus:ring-offset-night-surface disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 ${shapeClass}`}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {iconPosition === 'leading' && iconEl}
      <span>{label}</span>
      {iconPosition === 'trailing' && iconEl}
    </button>
  );
};

export default PrimaryButton;
