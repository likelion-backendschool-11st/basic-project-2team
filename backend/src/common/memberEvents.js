'use strict';

const { createPostEvents } = require('./postEvents');

/** 회원에게 보내는 변경 신호의 종류. 내용은 담지 않고, 클라이언트가 받으면 인증된 API 로 다시 조회합니다. */
const MEMBER_EVENT = Object.freeze({
  /** 내 알림함에 알림이 생기거나 지워짐 (헤더 배지·알림 목록을 다시 불러옴) */
  notifications: 'notifications',
});

/**
 * 회원별 실시간 구독 허브(SSE 용). 공고 허브(postEvents)와 같은 구조이고 키만 회원 id 입니다.
 * 프로세스 메모리에만 있으므로 서버를 여러 대로 늘리면 공유 채널(Redis 등)이 필요합니다.
 * publish 는 변경이 DB 에 커밋된 뒤에 호출합니다.
 */
const createMemberEvents = () => createPostEvents();

module.exports = { MEMBER_EVENT, createMemberEvents };
