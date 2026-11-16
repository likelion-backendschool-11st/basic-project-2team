'use strict';

const { ApiError } = require('../common/ApiError');
const { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, CODE_PATTERN, notificationMessages: m } = require('./notificationConstants');

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

const isObject = (body) => typeof body === 'object' && body !== null && !Array.isArray(body);

/** POST /subscriptions 본문 { game, detail? } */
function parseSubscriptionBody(body) {
  const fields = [];
  const source = isObject(body) ? body : {};
  const game = source.game;
  if (typeof game !== 'string' || !CODE_PATTERN.test(game)) fields.push({ field: 'game', message: m.gameInvalid });
  const detail = source.detail ?? null;
  if (detail !== null && (typeof detail !== 'string' || !CODE_PATTERN.test(detail))) fields.push({ field: 'detail', message: m.detailInvalid });
  if (fields.length > 0) throw new ApiError(400, 'INVALID_INPUT', m.invalidInput, fields);
  return { game, detail };
}

/** PATCH /subscriptions/:id 본문 { enabled } */
function parseEnabledBody(body) {
  const enabled = isObject(body) ? body.enabled : undefined;
  if (typeof enabled !== 'boolean') throw new ApiError(400, 'INVALID_INPUT', m.invalidInput, [{ field: 'enabled', message: m.enabledInvalid }]);
  return enabled;
}

module.exports = { parseId, parseListQuery, parseSubscriptionBody, parseEnabledBody };
