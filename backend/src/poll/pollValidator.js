'use strict';

const { ApiError } = require('../common/ApiError');
const { POST_ID_PATTERN } = require('../board/boardConstants');
const {
  POLL_TITLE_MAX,
  POLL_DESCRIPTION_MAX,
  POLL_OPTION_MAX_LENGTH,
  POLL_MIN_OPTIONS,
  POLL_MAX_OPTIONS,
  POLL_NOTICE_MAX,
  POLL_MAX_DURATION_DAYS,
  pollMessages: m,
} = require('./pollConstants');

const DAY_MS = 24 * 60 * 60 * 1000;
const charLength = (value) => Array.from(value).length;
const asString = (value) => (typeof value === 'string' ? value.trim() : '');
const asObject = (body) => (body && typeof body === 'object' ? body : {});

/** 숫자 또는 숫자 문자열을 1 이상의 정수로. 형식이 틀리면 null */
function parseId(raw) {
  const text = typeof raw === 'number' ? String(raw) : raw;
  if (typeof text !== 'string' || !POST_ID_PATTERN.test(text)) return null;
  const id = Number(text);
  return Number.isSafeInteger(id) ? id : null;
}

/** 필드 오류를 모았다가 한 번에 400 으로 던지는 도우미 */
function collector() {
  const fields = [];
  return {
    fail: (field, message) => fields.push({ field, message }),
    throwIfAny: () => {
      if (fields.length > 0) throw new ApiError(400, 'INVALID_INPUT', m.invalidInput, fields);
    },
  };
}

/** 값이 없으면 fallback, 있으면 boolean 이어야 합니다. */
function readBoolean(source, field, fallback, fail) {
  const value = source[field] ?? fallback;
  if (typeof value !== 'boolean') fail(field, m.booleanInvalid);
  return value === true;
}

/**
 * 투표 생성·편집 요청 `{ title, description?, multiple?, commentersOnly?, pinned?, closesAt, options }` 을 검증·정규화합니다.
 * @param {Date} now 마감 시각 검사 기준
 * @returns {{ title: string, description: string | null, multiple: boolean, commentersOnly: boolean, pinned: boolean, closesAt: Date, options: string[] }}
 */
function validatePollInput(body, now) {
  const source = asObject(body);
  const { fail, throwIfAny } = collector();

  const title = asString(source.title);
  if (!title) fail('title', m.titleRequired);
  else if (charLength(title) > POLL_TITLE_MAX) fail('title', m.titleTooLong);

  const description = asString(source.description);
  if (charLength(description) > POLL_DESCRIPTION_MAX) fail('description', m.descriptionTooLong);

  const multiple = readBoolean(source, 'multiple', false, fail);
  const commentersOnly = readBoolean(source, 'commentersOnly', false, fail);
  const pinned = readBoolean(source, 'pinned', true, fail);

  const closesAt = typeof source.closesAt === 'string' ? new Date(source.closesAt) : null;
  if (!closesAt || Number.isNaN(closesAt.getTime())) fail('closesAt', m.closesAtInvalid);
  else if (closesAt <= now) fail('closesAt', m.closesAtPast);
  else if (closesAt.getTime() - now.getTime() > POLL_MAX_DURATION_DAYS * DAY_MS) fail('closesAt', m.closesAtTooFar);

  const options = Array.isArray(source.options) ? source.options.map(asString) : [];
  if (options.length < POLL_MIN_OPTIONS || options.length > POLL_MAX_OPTIONS) fail('options', m.optionsCount);
  else if (options.some((label) => !label)) fail('options', m.optionRequired);
  else if (options.some((label) => charLength(label) > POLL_OPTION_MAX_LENGTH)) fail('options', m.optionTooLong);
  else if (new Set(options).size !== options.length) fail('options', m.optionDuplicated);

  throwIfAny();
  return { title, description: description || null, multiple, commentersOnly, pinned, closesAt, options };
}

/**
 * 투표하기 요청 `{ optionIds }` — 빈 배열이면 내 투표를 취소합니다. 중복 id 는 하나로 합칩니다.
 * @returns {{ optionIds: number[] }}
 */
function validateVote(body) {
  const source = asObject(body);
  const { fail, throwIfAny } = collector();
  const raw = Array.isArray(source.optionIds) ? source.optionIds : null;
  const optionIds = raw ? raw.map(parseId) : [];
  if (!raw || raw.length > POLL_MAX_OPTIONS || optionIds.includes(null)) fail('optionIds', m.optionIdsInvalid);
  throwIfAny();
  return { optionIds: [...new Set(optionIds)] };
}

/** 공지 고정 요청 `{ pinned }` */
function validatePin(body) {
  const { fail, throwIfAny } = collector();
  const source = asObject(body);
  if (typeof source.pinned !== 'boolean') fail('pinned', m.booleanInvalid);
  throwIfAny();
  return { pinned: source.pinned };
}

/**
 * 결과 확정 요청 `{ finalOptionId, notice?, pinned?, postComment?, notifyMembers? }`
 * @returns {{ finalOptionId: number, notice: string | null, pinned: boolean | null, postComment: boolean, notifyMembers: boolean }}
 */
function validateClose(body) {
  const source = asObject(body);
  const { fail, throwIfAny } = collector();

  const finalOptionId = parseId(source.finalOptionId);
  if (finalOptionId === null) fail('finalOptionId', m.finalOptionInvalid);

  const notice = asString(source.notice);
  if (charLength(notice) > POLL_NOTICE_MAX) fail('notice', m.noticeTooLong);

  // pinned 를 보내지 않으면 고정 상태를 그대로 둡니다.
  const pinned = source.pinned === undefined ? null : source.pinned;
  if (pinned !== null && typeof pinned !== 'boolean') fail('pinned', m.booleanInvalid);

  const postComment = readBoolean(source, 'postComment', false, fail);
  const notifyMembers = readBoolean(source, 'notifyMembers', false, fail);

  throwIfAny();
  return { finalOptionId, notice: notice || null, pinned, postComment, notifyMembers };
}

module.exports = { parseId, validatePollInput, validateVote, validatePin, validateClose };
