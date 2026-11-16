import React from 'react';
import { expText, type ExpGaugeView } from '../../data/userData';

type ExpGaugeSize = 'sm' | 'md';

interface ExpGaugeProps {
  readonly exp: ExpGaugeView;
  /** sm: 헤더 간략 프로필 (막대만, 수치는 툴팁) · md: 마이페이지 (제목·수치 함께) */
  readonly size?: ExpGaugeSize;
  readonly className?: string;
}

const trackHeight: Record<ExpGaugeSize, string> = { sm: 'h-1', md: 'h-2' };

/** 이번 레벨의 경험치 진행도를 보여주는 노란색 게이지 */
export const ExpGauge: React.FC<ExpGaugeProps> = ({ exp, size = 'md', className = '' }) => (
  <div className={`flex flex-col gap-1 ${className}`} title={`${exp.label} · ${exp.description}`}>
    {size === 'md' && (
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="font-bold tracking-wide text-amberAccent">{expText.title}</span>
        <span className="font-semibold text-fog-sub">{exp.label}</span>
      </div>
    )}
    <div
      role="progressbar"
      aria-label={expText.title}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={exp.percent}
      aria-valuetext={`${exp.label}, ${exp.description}`}
      className={`w-full overflow-hidden rounded-full bg-night-base ${trackHeight[size]}`}
    >
      <div
        className="h-full rounded-full bg-amberAccent shadow-[0_0_6px] shadow-amberAccent/60 transition-[width] duration-500"
        style={{ width: `${exp.percent}%` }}
      />
    </div>
  </div>
);

export default ExpGauge;
