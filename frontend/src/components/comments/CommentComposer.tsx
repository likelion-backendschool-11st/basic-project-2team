import React, { useState } from 'react';
import { commentText } from '../../data/commentData';

interface CommentComposerProps {
  readonly placeholder: string;
  readonly submitLabel: string;
  readonly allowSecret?: boolean;
  readonly autoFocus?: boolean;
  /** 성공하면 true — 입력창을 비웁니다. 서버 요청이면 Promise 를 돌려줍니다. */
  readonly onSubmit: (text: string, secret: boolean) => boolean | Promise<boolean>;
  readonly onCancel?: () => void;
}

export const CommentComposer: React.FC<CommentComposerProps> = ({ placeholder, submitLabel, allowSecret, autoFocus, onSubmit, onCancel }) => {
  const [text, setText] = useState('');
  const [secret, setSecret] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (await onSubmit(text, secret)) { setText(''); setSecret(false); }
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="rounded-2xl border border-night-borderLight bg-night-base/60 p-4">
      {allowSecret && (
        <label className="flex items-center justify-end gap-2 text-[11px] text-fog-sub mb-2 cursor-pointer">
          <input type="checkbox" checked={secret} onChange={(e) => setSecret(e.target.checked)} className="rounded border-night-borderLight bg-night-card text-mercury" />{commentText.secret}
        </label>
      )}
      <textarea
        value={text}
        autoFocus={autoFocus}
        maxLength={commentText.max}
        rows={3}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit(); }}
        className="w-full resize-none rounded-xl bg-night-surface border-0 p-3 text-sm text-fog-headline placeholder:text-fog-muted focus:ring-1 focus:ring-mercury"
      />
      <div className="flex items-center justify-between mt-3">
        <span className="text-[11px] font-mono text-fog-muted">{text.length}/{commentText.max}</span>
        <div className="flex gap-2">
          {onCancel && <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-xs text-fog-sub hover:text-white">{commentText.cancel}</button>}
          <button type="button" onClick={() => void submit()} disabled={!text.trim() || submitting} className="px-5 py-2 rounded-lg bg-mercury hover:bg-mercury-light text-xs font-bold text-white disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2">{submitLabel}<i className="fa-solid fa-paper-plane text-[10px]" /></button>
        </div>
      </div>
    </div>
  );
};

export default CommentComposer;
