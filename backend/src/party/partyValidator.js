'use strict';

const { ApiError } = require('../common/ApiError');
const {
  DECISION_STATUSES,
  LIST_STATUSES,
  POST_STATUSES,
  ROLE_MAX_LENGTH,
  MESSAGE_MAX_LENGTH,
  KICK_REASON_MAX_LENGTH,
  partyMessages: m,
} = require('./partyConstants');

const charLength = (value) => Array.from(value).length;
const POSITIVE_INT = /^[1-9]\d*$/;

/** 경로의 id 문자열 → 1 이상의 안전한 정수, 아니면 null (호출하는 쪽에서 404 로 바꿉니다) */
function parseId(raw) {
  return typeof raw === 'string' && POSITIVE_INT.test(raw) && Number.isSafeInteger(Number(raw)) ? Number(raw) : null;
}

/** 비어 있으면 null. 문자열이 아니거나 길면 undefined(오류) */
function optionalText(value, max) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (charLength(text) > max) return undefined;
  return text || null;
}

/** 참가 신청 본문 { role?, message? } */
function validateApply(body) {
  const source = body && typeof body === 'object' ? body : {};
  const role = optionalText(source.role, ROLE_MAX_LENGTH);
  const message = optionalText(source.message, MESSAGE_MAX_LENGTH);
  const fields = [];
  if (role === undefined) fields.push({ field: 'role', message: m.roleInvalid });
  if (message === undefined) fields.push({ field: 'message', message: m.messageInvalid });
  if (fields.length > 0) throw new ApiError(400, 'INVALID_INPUT', m.invalidInput, fields);
  return { role, message };
}

/** 추방 본문 { reason? } — 본문이 없어도 됩니다. 줄바꿈은 한 칸 띄어쓰기로 바꿉니다(알림 문구 형식 유지). */
function validateKick(body) {
  const source = body && typeof body === 'object' ? body : {};
  const raw = typeof source.reason === 'string' ? source.reason.replace(/\s+/g, ' ') : source.reason;
  const reason = optionalText(raw, KICK_REASON_MAX_LENGTH);
  if (reason === undefined) throw new ApiError(400, 'INVALID_INPUT', m.invalidInput, [{ field: 'reason', message: m.kickReasonInvalid }]);
  return { reason };
}

/** 승인/거절 본문 { status } */
function validateDecision(body) {
  const status = body && typeof body === 'object' ? body.status : undefined;
  if (!DECISION_STATUSES.includes(status)) {
    throw new ApiError(400, 'INVALID_INPUT', m.invalidInput, [{ field: 'status', message: m.statusInvalid }]);
  }
  return { status };
}

/** 공고 상태 변경 본문 { status } */
function validatePostStatus(body) {
  const status = body && typeof body === 'object' ? body.status : undefined;
  if (!POST_STATUSES.includes(status)) {
    throw new ApiError(400, 'INVALID_INPUT', m.invalidInput, [{ field: 'status', message: m.postStatusInvalid }]);
  }
  return { status };
}

/** 신청자 목록 쿼리 ?status= (생략하면 null) */
function parseListStatus(query) {
  const status = query?.status;
  if (status === undefined) return null;
  if (!LIST_STATUSES.includes(status)) {
    throw new ApiError(400, 'INVALID_INPUT', m.invalidInput, [{ field: 'status', message: m.listStatusInvalid }]);
  }
  return status;
}

/** 파티 초대 본문 { memberId } — 초대할 회원 id (양의 정수) */
function validateInvite(body) {
  const memberId = body && typeof body === 'object' ? body.memberId : undefined;
  if (!Number.isSafeInteger(memberId) || memberId < 1) {
    throw new ApiError(400, 'INVALID_INPUT', m.invalidInput, [{ field: 'memberId', message: m.inviteeInvalid }]);
  }
  return { memberId };
}

module.exports = { parseId, validateApply, validateKick, validateDecision, validatePostStatus, parseListStatus, validateInvite };
