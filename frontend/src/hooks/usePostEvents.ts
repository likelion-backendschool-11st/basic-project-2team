import { useEffect, useRef } from 'react';
import { apiUrl } from '../api/http';

type Topic = 'post' | 'comments';

interface PostEventHandlers {
  /** 공고 본문 · 상태 · 인원 · 신청자 · 파티원이 바뀜 */
  readonly onPost: () => void;
  /** 댓글이 작성·수정·삭제·가림·복구됨 */
  readonly onComments: () => void;
}

/** 짧은 시간에 여러 신호가 오면(예: 내 동작 + 서버 신호) 한 번만 다시 불러옵니다. */
const DEBOUNCE_MS = 250;
/** 실시간 연결이 끊겨 있는 동안만 쓰는 대체 폴링 주기 */
const FALLBACK_POLL_MS = 30_000;

/**
 * 공고 변경 신호(SSE, GET /api/posts/{postId}/events)를 받아 화면을 다시 불러오게 합니다.
 * 신호에는 내용이 없고 「바뀌었다」는 사실만 있어서, 받으면 기존 API 로 다시 조회합니다.
 * 연결이 끊기면 브라우저가 자동으로 다시 연결하고(그 사이 놓친 신호는 재연결 직후 한 번 다시 불러와 맞춥니다),
 * 연결이 안 되는 동안에는 30초마다 대신 불러옵니다.
 */
export function usePostEvents(postId: string, handlers: PostEventHandlers) {
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });

  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    const timers: Partial<Record<Topic, number>> = {};
    const fire = (topic: Topic) => {
      window.clearTimeout(timers[topic]);
      timers[topic] = window.setTimeout(() => (topic === 'post' ? latest.current.onPost() : latest.current.onComments()), DEBOUNCE_MS);
    };
    const refreshAll = () => {
      fire('post');
      fire('comments');
    };

    let connected = false;
    let everOpened = false;
    const source = new EventSource(apiUrl(`/api/posts/${encodeURIComponent(postId)}/events`));
    source.onopen = () => {
      connected = true;
      if (everOpened) refreshAll(); // 재연결: 끊겨 있던 동안의 변경을 따라잡습니다
      everOpened = true;
    };
    source.onerror = () => {
      connected = false;
    };
    source.addEventListener('post', () => fire('post'));
    source.addEventListener('comments', () => fire('comments'));

    const fallback = window.setInterval(() => {
      if (!connected && document.visibilityState === 'visible') refreshAll();
    }, FALLBACK_POLL_MS);

    return () => {
      source.close();
      window.clearInterval(fallback);
      Object.values(timers).forEach((t) => window.clearTimeout(t));
    };
  }, [postId]);
}
