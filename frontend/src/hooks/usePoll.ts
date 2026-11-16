import { useCallback, useEffect, useState } from 'react';
import { errorMessageOf } from '../api/http';
import {
  closePoll,
  createPoll,
  getPoll,
  pinPoll,
  remindPoll,
  updatePoll,
  votePoll,
  type PollCloseInput,
  type PollInput,
  type PollResponse,
} from '../api/pollApi';
import { pollText } from '../data/pollData';
import { useModal } from './useModal';
import { useToast } from './useToast';

const sameIds = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((id) => b.includes(id));

/**
 * 공고의 파티 의견 조율 투표: 조회(GET /api/posts/{postId}/poll), 투표, 생성·편집, 고정, 결과 확정, 미투표자 알림.
 * 다른 사람이 투표하면 SSE poll 신호로 refresh 가 불립니다.
 */
export function usePoll(postId: string) {
  const [poll, setPoll] = useState<PollResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<readonly number[]>([]);
  const [busy, setBusy] = useState(false);
  /** 폼을 연 순간의 편집 대상 (null 이면 새 투표). 열어 둔 사이 누가 투표해도 모드가 바뀌지 않게 고정합니다. */
  const [formTarget, setFormTarget] = useState<PollResponse | null>(null);
  const formDialog = useModal(false);
  const closeDialog = useModal(false);
  const participantsDialog = useModal(false);
  const toast = useToast();

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    getPoll(postId)
      .then((result) => {
        if (!cancelled) setPoll(result);
      })
      .catch(() => {
        // 투표는 부가 정보라 불러오지 못하면 위젯을 숨깁니다(공고·댓글은 그대로 보임).
        if (!cancelled) setPoll(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId, reloadKey]);

  // 서버의 내 투표가 바뀌면(다시 불러오면) 선택 상태를 맞춥니다.
  // 다른 사람의 투표로 다시 불러온 경우엔 key 가 같아 내가 고르던 항목을 유지합니다.
  const votedKey = poll ? `${poll.id}:${poll.viewer?.votedOptionIds.join(',') ?? ''}` : '';
  const [syncedKey, setSyncedKey] = useState('');
  if (votedKey !== syncedKey) {
    setSyncedKey(votedKey);
    setSelected(poll?.viewer?.votedOptionIds ?? []);
  }

  const voted = poll?.viewer?.votedOptionIds ?? [];
  const dirty = !sameIds(selected, voted);

  /** 항목 클릭: 단일 선택이면 바꾸고(같은 항목이면 해제), 복수 선택이면 켜고 끕니다. */
  const toggleOption = (optionId: number) => {
    if (!poll?.viewer?.canVote) return;
    setSelected((prev) => {
      if (poll.multiple) return prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId];
      return prev.includes(optionId) ? [] : [optionId];
    });
  };

  /** 서버 요청을 하나씩만 보내고, 성공하면 응답으로 투표를 바꾼 뒤 토스트를 띄웁니다. */
  const run = async (action: () => Promise<PollResponse>, message: string) => {
    if (busy) return false;
    setBusy(true);
    try {
      setPoll(await action());
      toast.show(message);
      return true;
    } catch (err) {
      toast.show(errorMessageOf(err, pollText.failed));
      refresh();
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submitVote = () => {
    if (!poll || !dirty) return;
    void run(() => votePoll(poll.id, selected), selected.length === 0 ? pollText.voteCanceled : pollText.voted);
  };

  const togglePin = () => {
    if (!poll) return;
    void run(() => pinPoll(poll.id, !poll.pinned), poll.pinned ? pollText.unpinned : pollText.pinned);
  };

  const openCreate = () => { setFormTarget(null); formDialog.open(); };
  const openEdit = () => { setFormTarget(poll); formDialog.open(); };

  /** 생성 또는 편집 폼 저장 (모드는 폼을 열 때 정해짐). 성공하면 폼을 닫습니다. */
  const save = async (input: PollInput) => {
    const target = formTarget;
    const ok = target
      ? await run(() => updatePoll(target.id, input), pollText.updated)
      : await run(() => createPoll(postId, input), pollText.created);
    if (ok) formDialog.close();
  };

  const confirm = async (input: PollCloseInput) => {
    if (!poll) return;
    if (await run(() => closePoll(poll.id, input), pollText.confirmedToast)) closeDialog.close();
  };

  const remind = async () => {
    if (!poll || busy) return;
    setBusy(true);
    try {
      const { count } = await remindPoll(poll.id);
      toast.show(pollText.reminded(count));
    } catch (err) {
      toast.show(errorMessageOf(err, pollText.failed));
    } finally {
      setBusy(false);
    }
  };

  const reloadWithToast = () => {
    refresh();
    toast.show(pollText.refreshed);
  };

  /** 공대장이 새 투표를 만들 수 있는지: 투표가 없거나 마지막 투표가 확정·마감됨 */
  const canCreate = !poll || poll.status !== 'OPEN';
  /** 아무도 투표하지 않은 진행 중 투표만 편집할 수 있습니다. */
  const canEdit = poll?.status === 'OPEN' && poll.totalVoters === 0;

  return {
    poll, loading, busy, refresh, reloadWithToast, selected, dirty, toggleOption, submitVote, togglePin,
    save, confirm, remind, canCreate, canEdit, formDialog, formTarget, openCreate, openEdit, closeDialog, participantsDialog, toast,
  };
}
