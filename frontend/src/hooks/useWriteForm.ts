import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { detailChoices, gameChoices, headcounts, initialDraft, toolbarActions, typeChoices, writeText, type ToolbarAction } from '../data/writeData';
import { paths, ROUTES } from '../data/routes';
import { MY_POST_ID } from '../data/postData';
import { useModal } from './useModal';
import { useToast } from './useToast';

export type WriteDraft = typeof initialDraft;

const clock = () => new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
const labelOf = (list: readonly { value: string; label: string }[], value: string) => list.find((o) => o.value === value)?.label ?? '';

export function useWriteForm() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<WriteDraft>(initialDraft);
  const [savedAt, setSavedAt] = useState(clock);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const leave = useModal(false);
  const toast = useToast();

  const set = useCallback(<K extends keyof WriteDraft>(key: K, value: WriteDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }, []);

  /** Toolbar: wrap the selected text (or insert the syntax at the caret). */
  const applyToolbar = (action: ToolbarAction) => {
    const el = bodyRef.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const selected = draft.body.slice(s, e);
    const next = draft.body.slice(0, s) + action.before + selected + (action.after ?? '') + draft.body.slice(e);
    set('body', next);
    requestAnimationFrame(() => {
      el.focus();
      const caret = s + action.before.length + selected.length;
      el.setSelectionRange(caret, caret);
    });
  };

  const saveDraft = () => {
    setSavedAt(clock());
    toast.show('임시저장 되었습니다.');
  };

  const submit = () => {
    if (!draft.title.trim() || !draft.body.trim()) return setError(writeText.submitInvalid);
    navigate(paths.postDetail(MY_POST_ID));
  };

  const summary = [
    labelOf(detailChoices, draft.detail).replace(/^어둠군단장 /, ''),
    `${draft.headcount}인 파티(${draft.headcount - 1}명 모집)`,
    draft.voice ? '마이크 필수' : '마이크 선택',
  ].join(' • ');

  const chars = draft.body.replace(/\s/g, '').length;
  const gameLabel = labelOf(gameChoices, draft.game);
  const typeLabel = labelOf(typeChoices, draft.type);

  return {
    draft, set, savedAt, previewing, togglePreview: () => setPreviewing((v) => !v), error, bodyRef,
    toolbarActions, headcounts, applyToolbar, saveDraft, submit, summary, chars, gameLabel, typeLabel,
    leave, confirmLeave: () => navigate(ROUTES.board), toast,
  };
}
