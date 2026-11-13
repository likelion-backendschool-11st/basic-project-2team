'use strict';

const { ApiError } = require('../common/ApiError');
const {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  SEARCH_MAX_LENGTH,
  REASON_MAX_LENGTH,
  LONG_TEXT_MAX_LENGTH,
  SUSPEND_MAX_DAYS,
  reportStatus,
  reportStatuses,
  reportUpdateStatuses,
  reportTargetTypes,
  reportAction,
  reportDoneActions,
  sanctionType,
  sanctionTypes,
  memberStatuses,
  postStatuses,
  commentFilterStatuses,
  commentUpdateStatuses,
  historyKinds,
  adminMessages,
} = require('./adminConstants');

const asTrimmedString = (value) => (typeof value === 'string' ? value.trim() : '');
const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});
/** 이모지처럼 서로게이트 쌍인 문자도 1자로 셉니다 (MySQL VARCHAR 글자 수 기준). */
const charLength = (value) => Array.from(value).length;

const invalidInput = (fields) => new ApiError(400, 'INVALID_INPUT', adminMessages.invalidInput, fields);

/** 오류를 모아 두었다가 한 번에 400 으로 던지는 도우미 */
function createErrors() {
  const fields = [];
  return {
    add: (field, message) => fields.push({ field, message }),
    throwIfAny: () => {
      if (fields.length > 0) throw invalidInput(fields);
    },
  };
}

/** 쿼리·본문의 정수 값. 비었으면 fallback, 정수가 아니면 NaN */
function toInteger(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const number = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isInteger(number) ? number : Number.NaN;
}

/** 비어 있으면 null, 허용 목록에 없으면 오류를 기록하고 null */
function optionalEnum(errors, field, value, allowed) {
  const text = asTrimmedString(value);
  if (!text) return null;
  if (!allowed.includes(text)) {
    errors.add(field, adminMessages.oneOf(allowed));
    return null;
  }
  return text;
}

/** 필수 사유 문자열 (1~max 자) */
function requiredReason(errors, field, value, max) {
  const text = asTrimmedString(value);
  if (!text) errors.add(field, adminMessages.reasonRequired);
  else if (charLength(text) > max) errors.add(field, adminMessages.reasonTooLong(max));
  return text;
}

/** 경로의 :id 를 양의 정수로 바꿉니다. */
function parseId(value) {
  const id = toInteger(value, Number.NaN);
  if (!Number.isSafeInteger(id) || id <= 0) throw invalidInput([{ field: 'id', message: adminMessages.idInvalid }]);
  return id;
}

/** page · size 공통 처리 */
function readPaging(errors, query) {
  const page = toInteger(query.page, 1);
  const size = toInteger(query.size, DEFAULT_PAGE_SIZE);
  if (!Number.isSafeInteger(page) || page < 1) errors.add('page', adminMessages.pageInvalid);
  if (!Number.isInteger(size) || size < 1 || size > MAX_PAGE_SIZE) errors.add('size', adminMessages.sizeInvalid);
  return { page, size, offset: (page - 1) * size };
}

function readSearch(errors, query) {
  const q = asTrimmedString(query.q);
  if (charLength(q) > SEARCH_MAX_LENGTH) errors.add('q', adminMessages.qInvalid);
  return q || null;
}

/**
 * 목록 조회 쿼리를 검증합니다. filters 는 { 쿼리 키: 허용 값 목록 } 입니다.
 * @returns {{ page: number, size: number, offset: number, q?: string | null } & Record<string, string | null>}
 */
function validateListQuery(rawQuery, { filters = {}, search = false } = {}) {
  const query = asObject(rawQuery);
  const errors = createErrors();
  const result = readPaging(errors, query);
  for (const [key, allowed] of Object.entries(filters)) result[key] = optionalEnum(errors, key, query[key], allowed);
  if (search) result.q = readSearch(errors, query);
  errors.throwIfAny();
  return result;
}

const validateReportListQuery = (query) =>
  validateListQuery(query, { filters: { status: reportStatuses, type: reportTargetTypes } });
const validatePostListQuery = (query) => validateListQuery(query, { filters: { status: postStatuses }, search: true });
const validateMemberListQuery = (query) =>
  validateListQuery(query, { filters: { status: memberStatuses }, search: true });
const validateCommentListQuery = (query) =>
  validateListQuery(query, { filters: { status: commentFilterStatuses }, search: true });
const validateHistoryQuery = (query) => validateListQuery(query, { filters: { kind: Object.keys(historyKinds) } });

/** 관리자 로그인 `{ userId, password }` */
function validateAdminLogin(body) {
  const source = asObject(body);
  const userId = asTrimmedString(source.userId);
  const password = typeof source.password === 'string' ? source.password : '';
  const errors = createErrors();
  if (!userId) errors.add('userId', adminMessages.userIdRequired);
  if (!password) errors.add('password', adminMessages.passwordRequired);
  errors.throwIfAny();
  return { userId, password };
}

/** 이용 정지일 때만 1~SUSPEND_MAX_DAYS 일, 그 외에는 지정 불가 */
function readDays(errors, raw, isSuspend) {
  if (!isSuspend) {
    if (raw !== undefined && raw !== null) errors.add('days', adminMessages.daysNotAllowed);
    return null;
  }
  const days = typeof raw === 'number' ? raw : Number.NaN;
  if (!Number.isInteger(days) || days < 1 || days > SUSPEND_MAX_DAYS) errors.add('days', adminMessages.daysInvalid);
  return days;
}

/**
 * 신고 처리 `{ status, action?, days?, memo? }`
 * - IN_PROGRESS: 담당 표시와 메모만 (action 불가)
 * - DONE: action 필수 (WARN / SUSPEND(+days) / BAN / DELETE_CONTENT)
 * - REJECTED: action 불가, DISMISS 로 기록
 */
function validateReportUpdate(body) {
  const source = asObject(body);
  const errors = createErrors();

  const status = asTrimmedString(source.status);
  if (!reportUpdateStatuses.includes(status)) errors.add('status', adminMessages.oneOf(reportUpdateStatuses));

  let action = null;
  const hasAction = asTrimmedString(source.action) !== '';
  if (status === reportStatus.done) {
    if (hasAction) action = optionalEnum(errors, 'action', source.action, reportDoneActions);
    else errors.add('action', adminMessages.actionRequired);
  } else if (hasAction) {
    errors.add('action', adminMessages.actionNotAllowed);
  }
  if (status === reportStatus.rejected) action = reportAction.dismiss;

  const days = readDays(errors, source.days, action === reportAction.suspend);

  const memo = asTrimmedString(source.memo);
  if (charLength(memo) > LONG_TEXT_MAX_LENGTH) errors.add('memo', adminMessages.memoTooLong);

  errors.throwIfAny();
  return { status, action, days, memo: memo || null };
}

/** 공고 삭제 `{ reason }` */
function validatePostDelete(body) {
  const errors = createErrors();
  const reason = requiredReason(errors, 'reason', asObject(body).reason, REASON_MAX_LENGTH);
  errors.throwIfAny();
  return { reason };
}

/** 회원 제재 `{ type, days?, reason }` */
function validateSanction(body) {
  const source = asObject(body);
  const errors = createErrors();
  const type = asTrimmedString(source.type);
  if (!sanctionTypes.includes(type)) errors.add('type', adminMessages.oneOf(sanctionTypes));
  const days = readDays(errors, source.days, type === sanctionType.suspend);
  const reason = requiredReason(errors, 'reason', source.reason, LONG_TEXT_MAX_LENGTH);
  errors.throwIfAny();
  return { type, days, reason };
}

/** 댓글 가림·복구·삭제 `{ status, reason }` */
function validateCommentUpdate(body) {
  const source = asObject(body);
  const errors = createErrors();
  const status = asTrimmedString(source.status);
  if (!commentUpdateStatuses.includes(status)) errors.add('status', adminMessages.oneOf(commentUpdateStatuses));
  const reason = requiredReason(errors, 'reason', source.reason, REASON_MAX_LENGTH);
  errors.throwIfAny();
  return { status, reason };
}

module.exports = {
  parseId,
  validateReportListQuery,
  validatePostListQuery,
  validateMemberListQuery,
  validateCommentListQuery,
  validateHistoryQuery,
  validateAdminLogin,
  validateReportUpdate,
  validatePostDelete,
  validateSanction,
  validateCommentUpdate,
};
