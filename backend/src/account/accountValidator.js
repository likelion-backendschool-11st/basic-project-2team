'use strict';

const { ApiError } = require('../common/ApiError');
const { fieldRules } = require('../member/memberValidator');
const { memberMessages } = require('../member/memberConstants');
const {
  BIO_MAX_LENGTH,
  AGE_RANGE_MAX_LENGTH,
  MAX_PROFILE_GAMES,
  GAME_CODE_PATTERN,
  PROFILE_PLAY_STYLES,
  WITHDRAW_REASON_MAX_LENGTH,
  accountMessages: m,
} = require('./accountConstants');

const asObject = (body) => (body && typeof body === 'object' && !Array.isArray(body) ? body : {});
/** 이모지처럼 서로게이트 쌍인 문자도 1자로 셉니다 (MySQL VARCHAR 글자 수 기준). */
const charLength = (value) => Array.from(value).length;
/** 비밀번호는 공백도 그대로 검사해야 하므로 trim 하지 않습니다. */
const asPassword = (value) => (typeof value === 'string' ? value : '');

const invalidInput = (fields) => new ApiError(400, 'INVALID_INPUT', m.invalidInput, fields);

/**
 * null 또는 문자열만 받는 선택 항목. 앞뒤 공백을 지우고 빈 문자열은 null 로 저장합니다.
 * @returns {string | null | undefined} 형식이 틀리면 undefined
 */
function optionalText(value, maxLength) {
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (!text) return null;
  return charLength(text) <= maxLength ? text : undefined;
}

/** games 배열 → 중복 없는 코드 목록. 형식이 틀리면 null */
function parseGameCodes(raw) {
  if (!Array.isArray(raw)) return null;
  const codes = [];
  for (const item of raw) {
    if (typeof item !== 'string' || !GAME_CODE_PATTERN.test(item.trim())) return null;
    const code = item.trim();
    if (!codes.includes(code)) codes.push(code);
  }
  return codes.length <= MAX_PROFILE_GAMES ? codes : null;
}

/**
 * 프로필 수정 `PATCH /api/members/me` 본문. 보낸 항목만 바꿉니다.
 * 선호 게임(`games`, `mainGame`, `playStyle`)은 함께 보내며, `games` 를 보내면 게이머 프로필 전체를 교체합니다.
 * @returns {{
 *   nickname?: string, bio?: string | null, ageRange?: string | null, ageRangePublic?: boolean,
 *   games?: { codes: string[], mainGame: string | null, playStyle: string | null },
 * }}
 */
function validateProfileUpdate(body) {
  const source = asObject(body);
  const has = (key) => Object.hasOwn(source, key);
  const fields = [];
  const fail = (field, message) => fields.push({ field, message });
  const update = {};

  if (has('nickname')) {
    const nickname = typeof source.nickname === 'string' ? source.nickname.trim() : '';
    const message = fieldRules.nickname(nickname);
    if (message) fail('nickname', message);
    else update.nickname = nickname;
  }

  if (has('bio')) {
    const bio = optionalText(source.bio, BIO_MAX_LENGTH);
    if (bio === undefined) fail('bio', m.bioInvalid);
    else update.bio = bio;
  }

  if (has('ageRange')) {
    const ageRange = optionalText(source.ageRange, AGE_RANGE_MAX_LENGTH);
    if (ageRange === undefined) fail('ageRange', m.ageRangeInvalid);
    else update.ageRange = ageRange;
  }

  if (has('ageRangePublic')) {
    if (typeof source.ageRangePublic !== 'boolean') fail('ageRangePublic', m.ageRangePublicInvalid);
    else update.ageRangePublic = source.ageRangePublic;
  }

  if (has('games')) {
    const codes = parseGameCodes(source.games);
    if (codes === null) fail('games', m.gamesInvalid);

    const mainGame = source.mainGame ?? codes?.[0] ?? null;
    if (codes && mainGame !== null && !codes.includes(mainGame)) fail('mainGame', m.mainGameInvalid);

    const playStyle = source.playStyle ?? null;
    if (playStyle !== null && !PROFILE_PLAY_STYLES.includes(playStyle)) fail('playStyle', m.playStyleInvalid);

    if (codes) update.games = { codes, mainGame, playStyle };
  } else if (has('mainGame') || has('playStyle')) {
    fail('games', m.gamesInvalid);
  }

  if (fields.length > 0) throw invalidInput(fields);
  return update;
}

/** 비밀번호 변경 `{ currentPassword, newPassword }` — 새 비밀번호는 회원가입과 같은 규칙 */
function validatePasswordChange(body) {
  const source = asObject(body);
  const fields = [];
  const currentPassword = asPassword(source.currentPassword);
  if (!currentPassword) fields.push({ field: 'currentPassword', message: m.currentPasswordRequired });
  const newPassword = asPassword(source.newPassword);
  const message = fieldRules.password(newPassword);
  if (message) fields.push({ field: 'newPassword', message });
  if (fields.length > 0) throw invalidInput(fields);
  return { currentPassword, newPassword };
}

/** 회원 탈퇴 `{ password, reason? }` */
function validateWithdraw(body) {
  const source = asObject(body);
  const fields = [];
  const password = asPassword(source.password);
  if (!password) fields.push({ field: 'password', message: memberMessages.passwordRequired });
  const reason = source.reason === undefined ? null : optionalText(source.reason, WITHDRAW_REASON_MAX_LENGTH);
  if (reason === undefined) fields.push({ field: 'reason', message: m.reasonInvalid });
  if (fields.length > 0) throw invalidInput(fields);
  return { password, reason };
}

module.exports = { validateProfileUpdate, validatePasswordChange, validateWithdraw };
