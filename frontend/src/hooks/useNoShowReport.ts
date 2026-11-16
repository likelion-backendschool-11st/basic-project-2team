import { useState } from 'react';
import { ApiRequestError, errorMessageOf } from '../api/http';
import { reportNoShow } from '../api/postApi';
import { postText } from '../data/postData';

export interface NoShowTarget {
  readonly memberId: number;
  readonly name: string;
}

/**
 * 노쇼 신고 창 상태 (공고 상세 참가자 카드 · 마이페이지 별점 평가 창에서 함께 씁니다).
 * ask(target) → 사유 선택 → confirm. 이 화면에서 신고한 파티원은 reported 로 표시합니다(이미 신고했다는 409 도 같이 표시).
 */
export function useNoShowReport(postId: number | null, notify: (message: string) => void) {
  const [target, setTarget] = useState<NoShowTarget | null>(null);
  const [reportedIds, setReportedIds] = useState<ReadonlySet<number>>(new Set());

  const markReported = (memberId: number) => setReportedIds((prev) => new Set(prev).add(memberId));
  const close = () => setTarget(null);

  const confirm = async (reason: string, detail = '') => {
    const current = target;
    setTarget(null);
    if (!current || postId === null) return;
    try {
      await reportNoShow(postId, current.memberId, reason, detail.trim() || undefined);
      markReported(current.memberId);
      notify(postText.reportedToast);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'ALREADY_REPORTED') markReported(current.memberId);
      notify(errorMessageOf(err, postText.actionFailed));
    }
  };

  return {
    target,
    isOpen: target !== null,
    ask: setTarget,
    close,
    confirm,
    isReported: (memberId: number) => reportedIds.has(memberId),
  };
}
