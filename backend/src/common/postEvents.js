'use strict';

/** 공고 화면에 보내는 변경 신호의 종류. 내용은 담지 않고, 클라이언트가 신호를 받으면 인증된 API 로 다시 조회합니다. */
const POST_EVENT = Object.freeze({
  /** 공고 본문 · 상태 · 인원 · 신청자 · 파티원이 바뀜(삭제 포함) */
  post: 'post',
  /** 댓글이 작성·수정·삭제·가림·복구됨 */
  comments: 'comments',
});

/**
 * 공고별 실시간 구독 허브(SSE 용). 프로세스 메모리에만 있으므로 서버를 여러 대로 늘리면 공유 채널(Redis 등)이 필요합니다.
 * publish 는 변경이 DB 에 반영된(커밋된) 뒤에 호출해야 클라이언트가 다시 조회했을 때 새 값을 봅니다.
 */
function createPostEvents() {
  /** @type {Map<number, Set<(topic: string) => void>>} */
  const listeners = new Map();

  /** @returns {() => void} 구독 해제 함수 */
  function subscribe(postId, listener) {
    let set = listeners.get(postId);
    if (!set) listeners.set(postId, (set = new Set()));
    set.add(listener);
    return () => {
      set.delete(listener);
      if (set.size === 0) listeners.delete(postId);
    };
  }

  /** 한 구독자의 오류가 요청 처리나 다른 구독자에게 번지지 않게 합니다. */
  function publish(postId, topic) {
    for (const listener of [...(listeners.get(postId) ?? [])]) {
      try {
        listener(topic);
      } catch {
        // 끊어진 연결은 close 이벤트에서 정리됩니다.
      }
    }
  }

  const connectionCount = () => [...listeners.values()].reduce((sum, set) => sum + set.size, 0);

  return { subscribe, publish, connectionCount };
}

/** 허브를 주입하지 않은 서비스(단위 테스트 등)가 쓰는 아무 일도 하지 않는 허브 */
const NO_EVENTS = Object.freeze({ publish() {} });

module.exports = { POST_EVENT, NO_EVENTS, createPostEvents };
