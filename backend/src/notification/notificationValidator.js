'use strict';

const { ApiError } = require('../common/ApiError');
const { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, notificationMessages: m } = require('./notificationConstants');

/** 양의 정수 문자열이면 숫자로, 아니면 null (값이 없으면 fallback) */
function parseInteger(raw, fallback) {
  if (raw === undefined || raw === '') return fallback;
  return typeof raw === 'string' && /^\d{1,9}$/.test(raw) ? Number(raw) : null;
}

/** 경로의 알림 id → 1 이상의 안전한 정수, 아니면 null (호출하는 쪽에서 404 로 바꿉니다) */
function parseId(raw) {
  return typeof raw === 'string' && /^[1-9]\d*$/.test(raw) && Number.isSafeInteger(Number(raw)) ? Number(raw) : null;
}

/** 알림 목록 쿼리 ?page=&size=&unread= */
function parseListQuery(query) {
  const fields = [];
  const page = parseInteger(query.page, 1);
  if (page === null || page < 1) fields.push({ field: 'page', message: m.pageInvalid });
  const size = parseInteger(query.size, DEFAULT_PAGE_SIZE);
  if (size === null || size < 1 || size > MAX_PAGE_SIZE) fields.push({ field: 'size', message: m.sizeInvalid });
  const unread = query.unread === undefined ? 'false' : query.unread;
  if (unread !== 'true' && unread !== 'false') fields.push({ field: 'unread', message: m.unreadInvalid });
  if (fields.length > 0) throw new ApiError(400, 'INVALID_INPUT', m.invalidInput, fields);
  return { page, size, unreadOnly: unread === 'true' };
}

module.exports = { parseId, parseListQuery };
