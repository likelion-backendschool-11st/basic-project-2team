import React from 'react';
import { detailChoices, gameChoices, headcounts, styleChoices, typeChoices, writeText } from '../../data/writeData';
import type { WriteDraft } from '../../hooks/useWriteForm';
import { inputBaseClass } from '../signup/fieldStyles';

interface OptionPanelProps {
  readonly draft: WriteDraft;
  readonly onChange: <K extends keyof WriteDraft>(key: K, value: WriteDraft[K]) => void;
  readonly summary: string;
}

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

export const OptionPanel: React.FC<OptionPanelProps> = ({ draft, onChange, summary }) => {
  const index = Math.max(0, headcounts.findIndex((h) => h.value === draft.headcount));
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
        {([['game', writeText.game, gameChoices], ['type', writeText.type, typeChoices], ['detail', writeText.detail, detailChoices]] as const).map(([key, label, options]) => (
          <div key={key}>
            <Label text={label} />
            <select className={field} value={draft[key]} onChange={(e) => onChange(key, e.target.value)}>
              {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        ))}
        <div className="rounded-xl border border-night-borderLight bg-night-base/60 p-4">
          <input type="range" min={0} max={headcounts.length - 1} step={1} value={index} aria-label={writeText.headcount} onChange={(e) => onChange('headcount', headcounts[Number(e.target.value)].value)} className="w-full accent-mercury" />
          <div className="flex justify-between text-[11px] mt-1">
            {headcounts.map((h) => (
              <span key={h.value} className={h.value === draft.headcount ? 'font-bold text-mercury-light' : 'text-fog-muted'}>{h.label}</span>
            ))}
          </div>
          <p className="text-[11px] text-fog-muted mt-3 flex items-center gap-1.5"><i className="fa-solid fa-circle-info" />{writeText.headcountNote}</p>
        </div>
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
          <div className="grid grid-cols-2 gap-2">
            <input type="date" disabled={draft.tbd} value={draft.date} onChange={(e) => onChange('date', e.target.value)} className={`${field} disabled:opacity-40`} />
            <input type="time" disabled={draft.tbd} value={draft.time} onChange={(e) => onChange('time', e.target.value)} className={`${field} disabled:opacity-40`} />
          </div>
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
