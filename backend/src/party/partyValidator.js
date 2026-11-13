'use strict';

const { ApiError } = require('../common/ApiError');
const { DECISION_STATUSES, LIST_STATUSES, ROLE_MAX_LENGTH, MESSAGE_MAX_LENGTH, partyMessages: m } = require('./partyConstants');

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

/** 승인/거절 본문 { status } */
function validateDecision(body) {
  const status = body && typeof body === 'object' ? body.status : undefined;
  if (!DECISION_STATUSES.includes(status)) {
    throw new ApiError(400, 'INVALID_INPUT', m.invalidInput, [{ field: 'status', message: m.statusInvalid }]);
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

module.exports = { parseId, validateApply, validateDecision, parseListStatus };
