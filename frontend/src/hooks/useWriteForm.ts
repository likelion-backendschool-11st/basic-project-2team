import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HEADCOUNT_MAX, initialDraft, toolbarActions, typeLabels, writeText, type SelectOption, type ToolbarAction } from '../data/writeData';
import { paths, ROUTES } from '../data/routes';
import { getGames, type Game } from '../api/gameApi';
import { createPost, getLatestDraft, saveDraft as saveDraftApi } from '../api/postApi';
import { ApiRequestError } from '../api/http';
import { useModal } from './useModal';
import { useToast } from './useToast';

export type WriteDraft = typeof initialDraft;

/** 선택한 게임에 존재하는 모집 유형 목록 (상세 분류 유형의 중복 제거) */
const typesOf = (game: Game | undefined) => [...new Set((game?.contents ?? []).map((c) => c.type))];

/** 목록에 없는 선택값은 비우되, 선택지가 하나뿐이면(화면에 표시하지 않으므로) 그 값으로 자동 선택합니다. */
const pick = (current: string, values: readonly string[]) => (values.includes(current) ? current : values.length === 1 ? values[0] : '');

/** 게임 → 모집 유형 → 상세 분류 순으로 선택값을 맞춥니다. 기본값은 없음('')입니다. */
function normalizeDraft(draft: WriteDraft, games: readonly Game[]): WriteDraft {
  const game = games.find((g) => g.code === draft.game);
  const type = pick(draft.type, typesOf(game));
  const contents = (game?.contents ?? []).filter((c) => c.type === type);
  const detail = pick(draft.detail, contents.map((c) => c.code));
  // 선택한 상세 분류(모드)의 최대 인원을 넘지 않게 맞춥니다. 상세 분류를 고르기 전에는 전체 상한을 씁니다.
  const maxHeadcount = contents.find((c) => c.code === detail)?.maxHeadcount ?? HEADCOUNT_MAX;
  return { ...draft, game: game?.code ?? '', type, detail, headcount: Math.min(draft.headcount, maxHeadcount) };
}

const clock = (date = new Date()) => date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
const labelOf = (list: readonly { value: string; label: string }[], value: string) => list.find((o) => o.value === value)?.label ?? '';

export function useWriteForm() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<WriteDraft>(initialDraft);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [games, setGames] = useState<readonly Game[]>([]);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const leave = useModal(false);
  const toast = useToast();

  /**
   * 게임 목록(GET /api/games)과 내 임시저장(GET /api/posts/drafts/latest)을 한 번 불러옵니다.
   * 임시저장은 게임 목록이 있어야 선택값을 맞출 수 있어서 함께 받고, 로그인하지 않았거나 실패하면 빈 폼으로 시작합니다.
   */
  useEffect(() => {
    let cancelled = false;
    Promise.all([getGames(), getLatestDraft().catch(() => null)])
      .then(([list, saved]) => {
        if (cancelled) return;
        setGames(list);
        if (saved) {
          setDraft(normalizeDraft({ ...initialDraft, ...saved.draft }, list));
          setSavedAt(clock(new Date(saved.savedAt)));
          toast.show(writeText.draftLoaded);
        }
      })
      .catch(() => !cancelled && setError(writeText.optionsLoadFailed));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast.show 는 안정적이라 한 번만 실행
  }, []);

  const set = useCallback(
    <K extends keyof WriteDraft>(key: K, value: WriteDraft[K]) => {
      setDraft((prev) => normalizeDraft({ ...prev, [key]: value }, games));
      setError(null);
    },
    [games],
  );

  const options = useMemo(() => {
    const game = games.find((g) => g.code === draft.game);
    return {
      game: games.map((g): SelectOption => ({ value: g.code, label: g.name })),
      type: typesOf(game).map((t): SelectOption => ({ value: t, label: typeLabels[t] ?? t })),
      detail: (game?.contents ?? []).filter((c) => c.type === draft.type).map((c): SelectOption => ({ value: c.code, label: c.name })),
    };
  }, [games, draft.game, draft.type]);

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

  /** 작성 중인 폼을 서버에 저장합니다(회원당 1개, 덮어쓰기). */
  const saveDraft = async () => {
    try {
      const saved = await saveDraftApi(draft);
      setSavedAt(clock(new Date(saved.savedAt)));
      toast.show('임시저장 되었습니다.');
    } catch (err) {
      toast.show(err instanceof ApiRequestError && err.status === 401 ? writeText.draftNeedLogin : writeText.draftSaveFailed);
    }
  };

  /** 공고 작성 API 호출. 성공하면 새 공고 상세로 이동하고, 실패하면 서버 메시지를 보여줍니다. */
  const submit = async () => {
    if (!draft.title.trim() || !draft.body.trim()) return setError(writeText.submitInvalid);
    if (!draft.game) return setError(writeText.placeholders.game);
    if (!draft.type) return setError(writeText.placeholders.type);
    if (options.detail.length > 0 && !draft.detail) return setError(writeText.placeholders.detail);
    setSubmitting(true);
    try {
      const { id } = await createPost({
        title: draft.title,
        body: draft.body,
        partyName: draft.partyName,
        game: draft.game,
        type: draft.type,
        detail: draft.detail,
        headcount: draft.headcount,
        style: draft.style,
        scheduleTbd: draft.tbd,
        // 날짜·시간은 브라우저 로컬 시간 → 시간대가 포함된 ISO 문자열
        schedule: draft.tbd ? undefined : new Date(`${draft.date}T${draft.time}`).toISOString(),
        voiceRequired: draft.voice,
      });
      navigate(paths.postDetail(String(id)));
    } catch (err) {
      // 필드별 오류가 있으면 첫 번째 메시지를, 없으면 서버 메시지를 보여줍니다.
      setError(err instanceof ApiRequestError ? (err.fields[0]?.message ?? err.message) : writeText.submitFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const summary = [
    labelOf(options.detail, draft.detail).replace(/^어둠군단장 /, ''),
    `${draft.headcount}인 파티(${draft.headcount - 1}명 모집)`,
    draft.voice ? '마이크 필수' : '마이크 선택',
  ]
    .filter(Boolean)
    .join(' • ');

  const maxHeadcount = useMemo(
    () => games.find((g) => g.code === draft.game)?.contents.find((c) => c.code === draft.detail)?.maxHeadcount ?? HEADCOUNT_MAX,
    [games, draft.game, draft.detail],
  );

  const chars = draft.body.replace(/\s/g, '').length;
  const gameLabel = labelOf(options.game, draft.game);
  const typeLabel = labelOf(options.type, draft.type);

  return {
    draft, set, options, savedAt, previewing, submitting, togglePreview: () => setPreviewing((v) => !v), error, bodyRef,
    toolbarActions, maxHeadcount, applyToolbar, saveDraft, submit, summary, chars, gameLabel, typeLabel,
    leave, confirmLeave: () => navigate(ROUTES.board), toast,
  };
}
