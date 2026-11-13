'use strict';

const { ApiError } = require('../common/ApiError');
const {
  MEMBER_ID_PATTERN,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  APPLICATION_STATUSES,
  mypageMessages: m,
} = require('./mypageConstants');

/**
 * 경로 파라미터 memberId 를 숫자로 바꿉니다. 형식이 틀리면 null.
 * @param {unknown} raw
 * @returns {number | null}
 */
function parseMemberId(raw) {
  if (typeof raw !== 'string' || !MEMBER_ID_PATTERN.test(raw)) return null;
  const memberId = Number(raw);
  return Number.isSafeInteger(memberId) ? memberId : null;
}

/** 양의 정수 문자열이면 숫자로, 아니면 null (값이 없으면 fallback) */
function parseInteger(raw, fallback) {
  if (raw === undefined || raw === '') return fallback;
  return typeof raw === 'string' && /^\d{1,9}$/.test(raw) ? Number(raw) : null;
}

/** page·size 를 검증해 fields 에 오류를 쌓고 값을 돌려줍니다. */
function readPage(query, fail) {
  const page = parseInteger(query.page, 1);
  if (page === null || page < 1) fail('page', m.pageInvalid);
  const size = parseInteger(query.size, DEFAULT_PAGE_SIZE);
  if (size === null || size < 1 || size > MAX_PAGE_SIZE) fail('size', m.sizeInvalid);
  return { page, size };
}

function throwIfInvalid(fields) {
  if (fields.length > 0) throw new ApiError(400, 'INVALID_INPUT', m.invalidInput, fields);
}

/**
 * 내 공고·내 댓글 목록 쿼리 (page, size)
 * @returns {{ page: number, size: number }}
 */
function parsePageQuery(query) {
  const fields = [];
  const result = readPage(query, (field, message) => fields.push({ field, message }));
  throwIfInvalid(fields);
  return result;
}

/**
 * 내 신청 목록 쿼리 (status, page, size). status 를 생략하면 전체입니다.
 * @returns {{ status: string | null, page: number, size: number }}
 */
function parseApplicationQuery(query) {
  const fields = [];
  const fail = (field, message) => fields.push({ field, message });

  const status = query.status === undefined ? null : query.status;
  if (status !== null && (typeof status !== 'string' || !APPLICATION_STATUSES.includes(status))) {
    fail('status', m.statusInvalid);
  }
  const { page, size } = readPage(query, fail);

  throwIfInvalid(fields);
  return { status, page, size };
}

module.exports = { parseMemberId, parsePageQuery, parseApplicationQuery };
