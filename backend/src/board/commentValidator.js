'use strict';

const { ApiError } = require('../common/ApiError');
const { POST_ID_PATTERN } = require('./boardConstants');
const {
  COMMENT_MAX_LENGTH,
  COMMENT_SORTS,
  DEFAULT_COMMENT_SORT,
  DEFAULT_COMMENT_PAGE_SIZE,
  MAX_COMMENT_PAGE_SIZE,
  REPORT_TARGET_TYPES,
  REPORT_REASONS,
  REPORT_DETAIL_MAX_LENGTH,
  commentMessages: m,
} = require('./commentConstants');

const charLength = (value) => Array.from(value).length;
const asString = (value) => (typeof value === 'string' ? value.trim() : '');

/** 쿼리의 양의 정수 문자열이면 숫자로, 아니면 null (값이 없으면 fallback) */
function parseInteger(raw, fallback) {
  if (raw === undefined || raw === '') return fallback;
  return typeof raw === 'string' && /^\d{1,9}$/.test(raw) ? Number(raw) : null;
}

/** 본문의 id 값(숫자 또는 숫자 문자열)을 1 이상의 정수로. 형식이 틀리면 null */
function parseId(raw) {
  const text = typeof raw === 'number' ? String(raw) : raw;
  if (typeof text !== 'string' || !POST_ID_PATTERN.test(text)) return null;
  const id = Number(text);
  return Number.isSafeInteger(id) ? id : null;
}

/**
 * 댓글 목록 쿼리(sort, page, size)를 검증·정규화합니다.
 * @returns {{ sort: 'oldest' | 'newest', page: number, size: number }}
 */
function parseCommentListQuery(query) {
  const fields = [];
  const fail = (field, message) => fields.push({ field, message });

  const sort = query.sort === undefined ? DEFAULT_COMMENT_SORT : asString(query.sort);
  if (!COMMENT_SORTS.includes(sort)) fail('sort', m.sortInvalid);

  const page = parseInteger(query.page, 1);
  if (page === null || page < 1) fail('page', m.pageInvalid);

  const size = parseInteger(query.size, DEFAULT_COMMENT_PAGE_SIZE);
  if (size === null || size < 1 || size > MAX_COMMENT_PAGE_SIZE) fail('size', m.sizeInvalid);

  if (fields.length > 0) throw new ApiError(400, 'INVALID_INPUT', m.invalidInput, fields);
  return { sort, page, size };
}

const asObject = (body) => (body && typeof body === 'object' ? body : {});

/** 댓글 본문 text 를 검증해 앞뒤 공백을 뺀 값을 돌려줍니다. 오류는 fail 로 모읍니다. */
function checkText(raw, fail) {
  const text = asString(raw);
  if (!text) fail('text', m.textRequired);
  else if (charLength(text) > COMMENT_MAX_LENGTH) fail('text', m.textTooLong);
  return text;
}

/** 경로 파라미터 commentId 를 숫자로. 형식이 틀리면 null */
const parseCommentId = (raw) => parseId(raw);

/**
 * 댓글·대댓글 작성 요청 본문 `{ text, parentId?, secret? }` 을 검증·정규화합니다.
 * @returns {{ text: string, parentId: number | null, secret: boolean }}
 */
function validateCreateComment(body) {
  const source = asObject(body);
  const fields = [];
  const fail = (field, message) => fields.push({ field, message });

  const text = checkText(source.text, fail);

  const secret = source.secret ?? false;
  if (typeof secret !== 'boolean') fail('secret', m.secretInvalid);

  let parentId = null;
  if (source.parentId !== undefined && source.parentId !== null) {
    parentId = parseId(source.parentId);
    if (parentId === null) fail('parentId', m.parentIdInvalid);
  }

  if (fields.length > 0) throw new ApiError(400, 'INVALID_INPUT', m.invalidInput, fields);
  return { text, parentId, secret };
}

/**
 * 댓글 수정 요청 본문 `{ text }` 을 검증·정규화합니다.
 * @returns {{ text: string }}
 */
function validateUpdateComment(body) {
  const fields = [];
  const text = checkText(asObject(body).text, (field, message) => fields.push({ field, message }));
  if (fields.length > 0) throw new ApiError(400, 'INVALID_INPUT', m.invalidInput, fields);
  return { text };
}

/**
 * 신고 요청 본문 `{ targetType, targetId, reason, detail? }` 을 검증·정규화합니다.
 * @returns {{ targetType: string, targetId: number, reason: string, detail: string | null }}
 */
function validateCreateReport(body) {
  const source = asObject(body);
  const fields = [];
  const fail = (field, message) => fields.push({ field, message });

  const targetType = asString(source.targetType);
  if (targetType !== REPORT_TARGET_TYPES.comment) fail('targetType', m.targetTypeInvalid);

  const targetId = parseId(source.targetId);
  if (targetId === null) fail('targetId', m.targetIdInvalid);

  const reason = asString(source.reason);
  if (!REPORT_REASONS.includes(reason)) fail('reason', m.reasonInvalid);

  const detail = asString(source.detail);
  if (charLength(detail) > REPORT_DETAIL_MAX_LENGTH) fail('detail', m.detailTooLong);

  if (fields.length > 0) throw new ApiError(400, 'INVALID_INPUT', m.invalidInput, fields);
  return { targetType, targetId, reason, detail: detail || null };
}

module.exports = {
  parseCommentId,
  parseCommentListQuery,
  validateCreateComment,
  validateUpdateComment,
  validateCreateReport,
};
