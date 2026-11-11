import React from 'react';
import type { ToolbarAction } from '../../data/writeData';
import { writeText } from '../../data/writeData';

interface MarkdownEditorProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly actions: readonly ToolbarAction[];
  readonly onAction: (action: ToolbarAction) => void;
  readonly textareaRef: React.RefObject<HTMLTextAreaElement>;
  readonly chars: number;
  readonly previewing: boolean;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ value, onChange, actions, onAction, textareaRef, chars, previewing }) => (
  <section className="rounded-2xl border border-night-borderLight bg-night-surface overflow-hidden flex flex-col min-h-[520px]">
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-night-borderLight">
      <div className="flex items-center gap-1">
        {actions.map((a) => (
          <button key={a.id} type="button" aria-label={a.label} title={a.label} disabled={previewing} onClick={() => onAction(a)} className="w-9 h-9 rounded-lg text-fog-sub hover:text-white hover:bg-white/10 disabled:opacity-40">
            <i className={`fa-solid ${a.icon} text-sm`} />
          </button>
        ))}
      </div>
      <span className="text-[11px] font-mono text-mercury-light bg-mercury/10 px-2 py-1 rounded">{writeText.markdown}</span>
    </div>
    {previewing ? (
      <div className="flex-1 p-6 whitespace-pre-wrap text-sm leading-7 text-fog-headline">{value}</div>
    ) : (
      <textarea ref={textareaRef} value={value} onChange={(e) => onChange(e.target.value)} placeholder={writeText.bodyPlaceholder} className="flex-1 w-full resize-none bg-transparent border-0 p-6 text-sm leading-7 text-fog-headline placeholder:text-fog-muted focus:ring-0 focus:outline-none" />
    )}
    <footer className="flex items-center justify-between px-6 py-3 border-t border-night-borderLight text-xs text-fog-muted">
      <span>
        {writeText.charCount} <b className="text-white">{chars}</b>자 &nbsp; {writeText.readTime} <b className="text-white">1분 미만</b>
      </span>
      <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emeraldAccent" />{writeText.active}</span>
    </footer>
  </section>
);

export default MarkdownEditor;
