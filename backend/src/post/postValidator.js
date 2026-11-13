'use strict';

const { ApiError } = require('../common/ApiError');
const {
  TITLE_MIN_LENGTH,
  TITLE_MAX_LENGTH,
  BODY_MAX_LENGTH,
  PARTY_NAME_MAX_LENGTH,
  HEADCOUNT_MIN,
  HEADCOUNT_MAX,
  MAX_TAGS,
  TAG_MAX_LENGTH,
  PARTY_TYPES,
  PLAY_STYLES,
  postMessages: m,
} = require('./postConstants');

const asTrimmedString = (value) => (typeof value === 'string' ? value.trim() : '');
const charLength = (value) => Array.from(value).length;
const isBlankOrUndefined = (value) => value === undefined || value === null || value === '';

/** 태그: 앞 # 제거, 중복 제거. 형식이 틀리면 null */
function normalizeTags(raw) {
  if (isBlankOrUndefined(raw)) return [];
  if (!Array.isArray(raw)) return null;
  const tags = [];
  for (const item of raw) {
    if (typeof item !== 'string') return null;
    const tag = item.trim().replace(/^#/, '');
    if (!tag || /\s/.test(tag) || charLength(tag) > TAG_MAX_LENGTH) return null;
    if (!tags.includes(tag)) tags.push(tag);
  }
  return tags.length <= MAX_TAGS ? tags : null;
}

/**
 * 공고 작성 요청 본문을 검증·정규화합니다.
 * @param {object} body
 * @param {Date} now 일정이 과거인지 비교할 기준 시각
 */
function validateCreatePost(body, now) {
  const source = body && typeof body === 'object' ? body : {};
  const fields = [];
  const fail = (field, message) => fields.push({ field, message });

  const title = asTrimmedString(source.title);
  if (charLength(title) < TITLE_MIN_LENGTH || charLength(title) > TITLE_MAX_LENGTH) fail('title', m.titleInvalid);

  const postBody = typeof source.body === 'string' ? source.body.trim() : '';
  if (!postBody) fail('body', m.bodyRequired);
  else if (charLength(postBody) > BODY_MAX_LENGTH) fail('body', m.bodyTooLong);

  const partyName = asTrimmedString(source.partyName);
  if (charLength(partyName) > PARTY_NAME_MAX_LENGTH) fail('partyName', m.partyNameInvalid);

  const game = asTrimmedString(source.game);
  if (!game) fail('game', m.gameRequired);

  const type = asTrimmedString(source.type);
  if (!PARTY_TYPES.includes(type)) fail('type', m.typeInvalid);

  const detail = isBlankOrUndefined(source.detail) ? '' : asTrimmedString(source.detail);
  if (!isBlankOrUndefined(source.detail) && !detail) fail('detail', m.detailInvalid);

  const headcount = source.headcount;
  if (!Number.isInteger(headcount) || headcount < HEADCOUNT_MIN || headcount > HEADCOUNT_MAX) {
    fail('headcount', m.headcountInvalid);
  }

  const style = asTrimmedString(source.style);
  if (style && !PLAY_STYLES.includes(style)) fail('style', m.styleInvalid);

  const voiceRequired = source.voiceRequired ?? false;
  if (typeof voiceRequired !== 'boolean') fail('voiceRequired', m.voiceInvalid);

  const scheduleTbd = source.scheduleTbd ?? false;
  let scheduleAt = null;
  if (typeof scheduleTbd !== 'boolean') {
    fail('scheduleTbd', m.scheduleTbdInvalid);
  } else if (!scheduleTbd) {
    if (isBlankOrUndefined(source.schedule)) {
      fail('schedule', m.scheduleRequired);
    } else {
      // 시간대 없는 문자열은 서버 시간대에 따라 해석이 달라지므로 offset(Z, +09:00)을 요구합니다.
      const hasZone = typeof source.schedule === 'string' && /(Z|[+-]\d{2}:?\d{2})$/i.test(source.schedule.trim());
      scheduleAt = hasZone ? new Date(source.schedule) : new Date(NaN);
      if (Number.isNaN(scheduleAt.getTime())) fail('schedule', m.scheduleInvalid);
      else if (scheduleAt <= now) fail('schedule', m.schedulePast);
    }
  }

  const tags = normalizeTags(source.tags);
  if (tags === null) fail('tags', m.tagsInvalid);

  if (fields.length > 0) throw new ApiError(400, 'INVALID_INPUT', m.invalidInput, fields);

  return {
    title,
    body: postBody,
    partyName: partyName || null,
    game,
    type,
    detail: detail || null,
    headcount,
    style: style || null,
    scheduleAt,
    voiceRequired,
    tags,
  };
}

module.exports = { validateCreatePost };
