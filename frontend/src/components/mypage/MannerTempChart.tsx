import React, { useEffect, useState } from 'react';
import { getMannerHistory, type MannerHistoryResponse } from '../../api/mypageApi';
import { memberProfileText } from '../../data/myPageData';

const W = 600;
const H = 180;
const PAD = { l: 36, r: 12, t: 12, b: 24 };

interface MannerTempChartProps {
  readonly memberId: number;
}

/** 매너 온도 꺾은선 그래프 (최근 7일 / 30일). 점 위에 마우스를 올리면 날짜·온도·받은 평가 수가 보입니다. */
export const MannerTempChart: React.FC<MannerTempChartProps> = ({ memberId }) => {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<MannerHistoryResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setFailed(false);
    getMannerHistory(memberId, days)
      .then((res) => !cancelled && setData(res))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [memberId, days]);

  const points = data?.points ?? [];
  const temps = points.map((p) => p.temp);
  // 변화가 작아도 보이도록 위아래 여유를 두고, 최소 1℃ 폭을 유지합니다.
  const min = temps.length ? Math.floor(Math.min(...temps) - 0.5) : 0;
  const max = temps.length ? Math.max(Math.ceil(Math.max(...temps) + 0.5), min + 1) : 1;
  const x = (i: number) => PAD.l + (points.length > 1 ? (i / (points.length - 1)) * (W - PAD.l - PAD.r) : 0);
  const y = (t: number) => PAD.t + (1 - (t - min) / (max - min)) * (H - PAD.t - PAD.b);
  const line = points.map((p, i) => `${x(i)},${y(p.temp)}`).join(' ');
  const labelAt = [0, Math.floor((points.length - 1) / 2), points.length - 1];

  return (
    <section className="rounded-2xl border border-night-borderLight bg-night-surface p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <i className="fa-solid fa-temperature-half text-mercury-light" />
          {memberProfileText.chartTitle}
        </h2>
        <div className="flex gap-1">
          {memberProfileText.chartRanges.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setDays(r.days)}
              aria-pressed={days === r.days}
              className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                days === r.days ? 'bg-mercury/15 border-mercury/40 text-mercury-light' : 'border-night-borderLight text-fog-sub hover:text-white'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      {failed ? (
        <p className="text-sm text-fog-muted">{memberProfileText.chartLoadFailed}</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={memberProfileText.chartTitle}>
          {[min, (min + max) / 2, max].map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="currentColor" className="text-night-borderLight" strokeDasharray="3 3" />
              <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" className="fill-fog-muted" fontSize="10">
                {Number.isInteger(t) ? t : t.toFixed(1)}°
              </text>
            </g>
          ))}
          {points.length > 0 && (
            <>
              <polyline points={line} fill="none" stroke="currentColor" className="text-mercury-light" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {points.map((p, i) => (
                <circle key={p.date} cx={x(i)} cy={y(p.temp)} r={p.reviewCount > 0 ? 4 : 2.5} className={p.reviewCount > 0 ? 'fill-mercury-light' : 'fill-night-surface stroke-mercury-light'} strokeWidth="1.5">
                  <title>{`${p.date} · ${p.temp.toFixed(1)}℃${p.reviewCount > 0 ? ` (평가 ${p.reviewCount}건)` : ''}`}</title>
                </circle>
              ))}
              {labelAt.map((i) => (
                <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} className="fill-fog-muted" fontSize="10">
                  {points[i].date.slice(5).replace('-', '/')}
                </text>
              ))}
            </>
          )}
        </svg>
      )}
      <p className="mt-2 text-xs text-fog-muted">{memberProfileText.chartNote}</p>
    </section>
  );
};

export default MannerTempChart;
