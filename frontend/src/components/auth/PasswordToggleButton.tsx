import React from 'react';

interface PasswordToggleButtonProps {
  readonly visible: boolean;
  readonly onToggle: () => void;
  readonly label: string;
}

export const PasswordToggleButton: React.FC<PasswordToggleButtonProps> = ({ visible, onToggle, label }) => (
  <button
    aria-label={label}
    aria-pressed={visible}
    className="absolute right-3.5 inset-y-0 flex items-center justify-center p-1 text-fog-muted hover:text-fog-headline transition-colors focus:outline-none"
    onClick={onToggle}
    title={label}
    type="button"
  >
    <i className={`fa-regular ${visible ? 'fa-eye-slash' : 'fa-eye'} text-sm`} />
  </button>
);

export default PasswordToggleButton;
