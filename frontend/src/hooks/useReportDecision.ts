import { useState } from 'react';
import { processReport, type AdminReportDetail } from '../api/adminApi';
import { DEFAULT_SUSPEND_DAYS, decisions, reportDetailText as t, type Decision, type DecisionId } from '../data/adminData';
import { useAdminErrorMessage } from './useAdminSession';
import { useModal } from './useModal';
import { useToast } from './useToast';

/** 이 신고에 고를 수 있는 결정인지 (공고·댓글 삭제는 공고·댓글 신고만, 노쇼 확정은 노쇼 신고만) */
export const isDecisionAllowed = (decision: Decision, report: Pick<AdminReportDetail, 'type'>) =>
  !decision.onlyFor || decision.onlyFor.includes(report.type);

/** 신고 상세의 처리 결정 폼: 결정 선택 → 사유 입력 → 확인 → PATCH, 끝나면 onDone 으로 다시 불러옵니다. */
export function useReportDecision(reportId: number | null, onDone: () => void) {
  const [decision, setDecision] = useState<DecisionId>('suspend');
  const [days, setDays] = useState<number>(DEFAULT_SUSPEND_DAYS);
  const [memo, setMemo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const confirm = useModal(false);
  const toast = useToast();
  const toMessage = useAdminErrorMessage();
  const selected = decisions.find((d) => d.id === decision) ?? decisions[0];

  const changeMemo = (value: string) => {
    setMemo(value);
    setError(null);
  };

  const send = async (body: Parameters<typeof processReport>[1], success: string) => {
    if (reportId === null) return;
    setBusy(true);
    try {
      await processReport(reportId, body);
      toast.show(success);
      setMemo('');
      onDone();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
      confirm.close();
    }
  };

  /** "처리하기": 사유가 있어야 확인 창을 엽니다. */
  const submit = () => (memo.trim() ? confirm.open() : setError(t.memoRequired));

  const confirmDecision = () => {
    if (busy) return;
    const body = { ...selected.request, memo: memo.trim(), ...(selected.request.action === 'SUSPEND' ? { days } : {}) };
    void send(body, t.processed);
  };

  /** 결정 전에 담당자가 검토 중임을 표시합니다 (메모는 선택). */
  const markInProgress = () => {
    if (!busy) void send({ status: 'IN_PROGRESS', memo: memo.trim() || undefined }, t.markedInProgress);
  };

  return { decision, setDecision, selected, days, setDays, memo, changeMemo, error, busy, confirm, toast, submit, confirmDecision, markInProgress };
}
