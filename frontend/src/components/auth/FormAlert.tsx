import React from 'react';

interface FormAlertProps {
  readonly message: React.ReactNode;
  readonly tone?: 'error' | 'success';
}

export const FormAlert: React.FC<FormAlertProps> = ({ message, tone = 'error' }) => {
  const toneClass = tone === 'error' ? 'bg-roseAccent/15 text-roseAccent' : 'bg-emeraldAccent/15 text-emeraldAccent';
  const icon = tone === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check';
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl ${toneClass}`} role={tone === 'error' ? 'alert' : 'status'}>
      <i className={`fa-solid ${icon} text-sm shrink-0`} />
      <span className="text-sm leading-snug font-medium">{message}</span>
    </div>
  );
};

export default FormAlert;
