import React from 'react';

interface PanelMessageProps {
  readonly children: React.ReactNode;
  /** 오류일 때 강조 색을 씁니다. */
  readonly error?: boolean;
}

/** 패널 안의 로딩 · 빈 상태 · 오류 안내 문구 */
export const PanelMessage: React.FC<PanelMessageProps> = ({ children, error = false }) => (
  <p role={error ? 'alert' : 'status'} className={`py-6 text-center text-xs ${error ? 'text-roseAccent' : 'text-fog-muted'}`}>
    {children}
  </p>
);

export default PanelMessage;
