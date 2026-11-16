import { useMemo, useState } from 'react';
import { formatClock, toLocalInput, type PollInput, type PollResponse } from '../api/pollApi';
import { POLL_MAX_OPTIONS, POLL_MIN_OPTIONS, pollText, type PollDeadline } from '../data/pollData';

const MINUTE = 60_000;

interface DeadlineChoice {
  readonly id: PollDeadline;
  readonly label: string;
  /** custom 이면 null (입력값으로 정함) */
  readonly at: Date | null;
}

/** 새 항목마다 붙이는 화면용 key (입력 순서가 바뀌어도 포커스를 지키려고) */
interface OptionDraft {
  readonly key: number;
  readonly label: string;
}

/**
 * 투표 생성·편집 폼 상태. editing 을 주면 그 투표 값으로 채우고 마감은 「현재 마감 유지」로 시작합니다.
 * @param scheduleAt 공고 출발 시각(ISO). 없거나 지났으면 「출발 n분 전」 선택지를 숨깁니다.
 */
export function usePollForm(editing: PollResponse | null, scheduleAt: string | null) {
  const t = pollText.form;
  const [openedAt] = useState(() => Date.now());
  const [nextKey, setNextKey] = useState(() => Math.max(POLL_MIN_OPTIONS, editing?.options.length ?? 0));
  const [title, setTitle] = useState(editing?.title ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [multiple, setMultiple] = useState(editing?.multiple ?? false);
  const [commentersOnly, setCommentersOnly] = useState(editing?.commentersOnly ?? false);
  const [pinned, setPinned] = useState(editing?.pinned ?? true);
  const [options, setOptions] = useState<readonly OptionDraft[]>(() =>
    editing ? editing.options.map((o, key) => ({ key, label: o.label })) : [{ key: 0, label: '' }, { key: 1, label: '' }],
  );
  const [custom, setCustom] = useState(() => toLocalInput(new Date(openedAt + 2 * 60 * MINUTE)));
  const [submitted, setSubmitted] = useState(false);

  const choices = useMemo<readonly DeadlineChoice[]>(() => {
    const list: DeadlineChoice[] = [];
    if (editing) {
      const at = new Date(editing.closesAt);
      list.push({ id: 'keep', label: pollText.deadlines.keep(formatClock(at)), at });
    }
    const start = scheduleAt ? new Date(scheduleAt).getTime() : null;
    if (start !== null) {
      const before30 = new Date(start - 30 * MINUTE);
      const before60 = new Date(start - 60 * MINUTE);
      if (before30.getTime() > openedAt) list.push({ id: 'before30', label: pollText.deadlines.before30(formatClock(before30)), at: before30 });
      if (before60.getTime() > openedAt) list.push({ id: 'before60', label: pollText.deadlines.before60(formatClock(before60)), at: before60 });
    }
    list.push({ id: 'after2h', label: pollText.deadlines.after2h, at: new Date(openedAt + 2 * 60 * MINUTE) });
    list.push({ id: 'custom', label: pollText.deadlines.custom, at: null });
    return list;
  }, [editing, scheduleAt, openedAt]);

  const [deadline, setDeadline] = useState<PollDeadline>(() => choices[0].id);

  const closesAt = deadline === 'custom' ? new Date(custom) : (choices.find((c) => c.id === deadline)?.at ?? null);
  const labels = options.map((o) => o.label.trim());
  const filled = labels.filter(Boolean);

  const errors = {
    title: !title.trim() ? t.errors.title : null,
    options: filled.length < POLL_MIN_OPTIONS || filled.length !== labels.length ? t.errors.options : new Set(labels).size !== labels.length ? t.errors.duplicated : null,
    // 「현재 마감 유지」는 서버가 다시 검사하므로 지금 이후인지만 봅니다.
    deadline: !closesAt || Number.isNaN(closesAt.getTime()) || closesAt.getTime() <= Date.now() ? t.errors.deadline : null,
  };
  const valid = !errors.title && !errors.options && !errors.deadline;

  const setOption = (key: number, label: string) => setOptions((prev) => prev.map((o) => (o.key === key ? { ...o, label } : o)));
  const removeOption = (key: number) => setOptions((prev) => (prev.length > POLL_MIN_OPTIONS ? prev.filter((o) => o.key !== key) : prev));
  const addOption = () => {
    if (options.length >= POLL_MAX_OPTIONS) return;
    setOptions((prev) => [...prev, { key: nextKey, label: '' }]);
    setNextKey((k) => k + 1);
  };

  /** 검증을 통과하면 요청 본문, 아니면 null (오류 문구를 보이기 시작합니다) */
  const toInput = (): PollInput | null => {
    setSubmitted(true);
    if (!valid || !closesAt) return null;
    return {
      title: title.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      multiple,
      commentersOnly,
      pinned,
      closesAt: closesAt.toISOString(),
      options: labels,
    };
  };

  return {
    title, setTitle, description, setDescription, multiple, setMultiple, commentersOnly, setCommentersOnly, pinned, setPinned,
    options, setOption, removeOption, addOption, canAdd: options.length < POLL_MAX_OPTIONS, canRemove: options.length > POLL_MIN_OPTIONS,
    choices, deadline, setDeadline, custom, setCustom, errors: submitted ? errors : null, toInput,
  };
}
