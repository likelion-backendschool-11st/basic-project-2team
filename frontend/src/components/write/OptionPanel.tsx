import React from 'react';
import { HEADCOUNT_MIN, styleChoices, writeText, type SelectOption } from '../../data/writeData';
import type { WriteDraft } from '../../hooks/useWriteForm';
import { inputBaseClass } from '../signup/fieldStyles';

interface OptionPanelProps {
  readonly draft: WriteDraft;
  readonly onChange: <K extends keyof WriteDraft>(key: K, value: WriteDraft[K]) => void;
  readonly summary: string;
  /** 선택한 게임 모드의 최대 모집 인원 (슬라이더 상한) */
  readonly maxHeadcount: number;
  /** 게임·모집 유형·상세 분류 선택지 (GET /api/games 로 불러온 값) */
  readonly options: { readonly game: readonly SelectOption[]; readonly type: readonly SelectOption[]; readonly detail: readonly SelectOption[] };
}

/** 브라우저 기본 range 손잡이 너비(Chrome 기준). 숫자 위치 계산에 사용. */
const THUMB_PX = 16;
const field = `${inputBaseClass} h-11 rounded-xl border border-night-borderLight bg-night-base text-sm`;
const Label: React.FC<{ readonly text: string; readonly side?: string }> = ({ text, side }) => (
  <div className="flex items-center justify-between text-xs mb-1.5">
    <span className="text-fog-sub">{text}</span>
    {side && <span className="text-mercury-light">{side}</span>}
  </div>
);
const SectionTitle: React.FC<{ readonly title: string; readonly side: string }> = ({ title, side }) => (
  <div className="flex items-center justify-between text-xs font-bold pb-2 border-b border-night-borderLight">
    <span className="text-mercury-light tracking-wide">{title}</span>
    <span className="font-normal text-fog-muted">{side}</span>
  </div>
);

export const OptionPanel: React.FC<OptionPanelProps> = ({ draft, onChange, summary, maxHeadcount, options: choices }) => {
  return (
    <aside className="rounded-2xl border border-night-borderLight bg-night-surface overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-night-borderLight">
        <h2 className="font-bold text-white flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-mercury" />{writeText.panelTitle}</h2>
        <span className="text-[10px] font-mono text-fog-muted bg-night-card px-2 py-1 rounded">{writeText.panelBadge}</span>
      </div>
      <div className="p-5 flex flex-col gap-5">
        <SectionTitle title={writeText.section1} side={writeText.section1Side} />
        <div>
          <Label text={writeText.partyName} side={writeText.partyNameSide} />
          <input className={field} value={draft.partyName} onChange={(e) => onChange('partyName', e.target.value)} />
        </div>
        {([['game', writeText.game, choices.game], ['type', writeText.type, choices.type], ['detail', writeText.detail, choices.detail]] as const)
          // 하위 항목(모집 유형·상세 분류)은 선택지가 하나뿐이면 자동 선택되므로 표시하지 않습니다.
          .filter(([key, , options]) => key === 'game' || options.length > 1)
          .map(([key, label, options]) => (
            <div key={key}>
              <Label text={label} />
              <select className={field} value={draft[key]} onChange={(e) => onChange(key, e.target.value)}>
                <option value="" disabled>{writeText.placeholders[key]}</option>
                {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
        {/* 게임 → 모집 유형 → 상세 분류가 모두 정해진(자동 선택 포함) 뒤에만 모집 인원을 보여줍니다. */}
        {draft.game && draft.type && draft.detail && (
          <div className="rounded-xl border border-night-borderLight bg-night-base/60 p-4">
            <Label text={writeText.headcount} side={`${draft.headcount} / ${maxHeadcount}`} />
            <input type="range" min={HEADCOUNT_MIN} max={maxHeadcount} disabled={maxHeadcount <= HEADCOUNT_MIN} step={1} value={draft.headcount} aria-label={writeText.headcount} onChange={(e) => onChange('headcount', Number(e.target.value))} className="w-full accent-mercury" />
            {/* 숫자를 슬라이더 손잡이(THUMB_PX) 중심선에 맞춰 배치: 양 끝은 손잡이 반지름만큼 안쪽 */}
            <div className="relative h-4 mt-1 text-[11px]">
              {Array.from({ length: maxHeadcount - HEADCOUNT_MIN + 1 }, (_, i) => HEADCOUNT_MIN + i).map((n) => (
                <span
                  key={n}
                  style={{ left: `calc(${THUMB_PX / 2}px + (100% - ${THUMB_PX}px) * ${maxHeadcount > HEADCOUNT_MIN ? (n - HEADCOUNT_MIN) / (maxHeadcount - HEADCOUNT_MIN) : 0})` }}
                  className={`absolute -translate-x-1/2 ${n === draft.headcount ? 'font-bold text-mercury-light' : 'text-fog-muted'}`}
                >{n}</span>
              ))}
            </div>
            <p className="text-[11px] text-fog-muted mt-3 flex items-center gap-1.5"><i className="fa-solid fa-circle-info" />{writeText.headcountNote}</p>
          </div>
        )}
        <div>
          <Label text={writeText.style} />
          <div className="grid grid-cols-2 gap-2">
            {styleChoices.map((s) => (
              <label key={s.id} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs cursor-pointer ${draft.style === s.id ? 'border-mercury bg-mercury/10 text-white' : 'border-night-borderLight text-fog-sub hover:border-night-hover'}`}>
                <input type="radio" name="style" className="sr-only" checked={draft.style === s.id} onChange={() => onChange('style', s.id)} />
                <span className={`w-3.5 h-3.5 rounded-full border-2 ${draft.style === s.id ? 'border-mercury bg-mercury' : 'border-night-borderLight'}`} />
                {s.emoji} {s.label}
              </label>
            ))}
          </div>
        </div>

        <SectionTitle title={writeText.section2} side={writeText.section2Side} />
        <div className="rounded-xl border border-night-borderLight p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm text-white">
            <span className="flex items-center gap-2"><i className="fa-regular fa-calendar text-mercury-light" />{writeText.schedule}</span>
            <label className="flex items-center gap-2 text-xs text-fog-sub cursor-pointer">
              {writeText.scheduleTbd}
              <input type="checkbox" role="switch" className="sr-only peer" checked={draft.tbd} onChange={(e) => onChange('tbd', e.target.checked)} />
              <span className="w-10 h-6 rounded-full bg-night-card peer-checked:bg-mercury relative transition-colors after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
            </label>
          </div>
          {!draft.tbd && (
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={draft.date} onChange={(e) => onChange('date', e.target.value)} className={field} />
              <input type="time" value={draft.time} onChange={(e) => onChange('time', e.target.value)} className={field} />
            </div>
          )}
          {draft.tbd && <p className="text-[11px] text-fog-muted"><i className="fa-solid fa-circle-info mr-1" />{writeText.scheduleNote}</p>}
          <label className="flex items-center gap-2 text-xs text-fog-sub cursor-pointer">
            <input type="checkbox" checked={draft.voice} onChange={(e) => onChange('voice', e.target.checked)} className="rounded border-night-borderLight bg-night-card text-mercury" />
            <i className="fa-solid fa-microphone text-mercury-light" />{writeText.voice}
          </label>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 px-5 py-3 border-t border-night-borderLight bg-night-deep text-xs">
        <span className="text-fog-muted shrink-0">{writeText.summary}</span>
        <span className="font-semibold text-mercury-light text-right">{summary}</span>
      </div>
    </aside>
  );
};

export default OptionPanel;
