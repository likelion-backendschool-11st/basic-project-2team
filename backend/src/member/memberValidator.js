'use strict';

const { ApiError } = require('../common/ApiError');
const {
  LOGIN_ID_PATTERN,
  PASSWORD_PATTERN,
  EMAIL_PATTERN,
  PHONE_PATTERN,
  NICKNAME_MIN_LENGTH,
  NICKNAME_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  agreementTypes,
  requiredAgreementKeys,
  checkTypeColumns,
  memberMessages,
} = require('./memberConstants');

const asTrimmedString = (value) => (typeof value === 'string' ? value.trim() : '');

/** 이모지처럼 서로게이트 쌍인 문자도 1자로 셉니다 (MySQL VARCHAR 글자 수 기준). */
const charLength = (value) => Array.from(value).length;

const normalizeEmail = (value) => asTrimmedString(value).toLowerCase();
const normalizePhone = (value) => asTrimmedString(value).replace(/[-\s]/g, '');

/** 각 필드 검증 함수: 오류 메시지를 반환하고, 통과하면 null */
const fieldRules = {
  userId(value) {
    if (!value) return memberMessages.userIdRequired;
    return LOGIN_ID_PATTERN.test(value) ? null : memberMessages.userIdInvalid;
  },
  nickname(value) {
    if (!value) return memberMessages.nicknameRequired;
    const length = charLength(value);
    const valid = !/\s/.test(value) && length >= NICKNAME_MIN_LENGTH && length <= NICKNAME_MAX_LENGTH;
    return valid ? null : memberMessages.nicknameInvalid;
  },
  email(value) {
    if (!value) return memberMessages.emailRequired;
    const valid = value.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(value);
    return valid ? null : memberMessages.emailInvalid;
  },
  phone(value) {
    if (!value) return memberMessages.phoneRequired;
    return PHONE_PATTERN.test(value) ? null : memberMessages.phoneInvalid;
  },
  password(value) {
    if (!value) return memberMessages.passwordRequired;
    return PASSWORD_PATTERN.test(value) ? null : memberMessages.passwordInvalid;
  },
  name(value) {
    return charLength(value) <= NAME_MAX_LENGTH ? null : memberMessages.nameInvalid;
  },
};

const invalidInput = (fields) => new ApiError(400, 'INVALID_INPUT', memberMessages.invalidInput, fields);

/** agreements 객체를 { terms, privacy, marketing } boolean 으로 정규화. 형식이 틀리면 null */
function normalizeAgreements(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const result = {};
  for (const key of Object.keys(agreementTypes)) {
    const value = raw[key] ?? false;
    if (typeof value !== 'boolean') return null;
    result[key] = value;
  }
  return result;
}

/**
 * 회원가입 요청 본문을 검증·정규화합니다.
 * address 는 DB 에 컬럼이 없어 저장하지 않으므로 무시합니다.
 * @returns {{ userId: string, nickname: string, email: string, phone: string, password: string, name: string | null, agreements: Record<string, boolean> }}
 */
function validateSignup(body) {
  const source = body && typeof body === 'object' ? body : {};
  const input = {
    userId: asTrimmedString(source.userId),
    nickname: asTrimmedString(source.nickname),
    email: normalizeEmail(source.email),
    phone: normalizePhone(source.phone),
    // 비밀번호는 공백도 그대로 검사해야 하므로 trim 하지 않음
    password: typeof source.password === 'string' ? source.password : '',
    name: asTrimmedString(source.name),
  };

  const fields = Object.entries(fieldRules)
    .map(([field, rule]) => ({ field, message: rule(input[field]) }))
    .filter((error) => error.message !== null);

  const agreements = normalizeAgreements(source.agreements);
  if (agreements === null) fields.push({ field: 'agreements', message: memberMessages.agreementsInvalid });

  if (fields.length > 0) throw invalidInput(fields);

  if (requiredAgreementKeys.some((key) => !agreements[key])) {
    throw new ApiError(400, 'REQUIRED_TERMS_NOT_AGREED', memberMessages.requiredTermsNotAgreed);
  }

  return { ...input, name: input.name || null, agreements };
}

/**
 * 중복 확인 쿼리(type, value)를 검증합니다. 형식이 틀린 값은 가입할 수 없으므로 400 으로 알려줍니다.
 * @returns {{ type: 'userId' | 'nickname' | 'email', value: string }}
 */
function validateCheckQuery(query) {
  const type = typeof query.type === 'string' ? query.type : '';
  if (!Object.hasOwn(checkTypeColumns, type)) {
    throw invalidInput([{ field: 'type', message: memberMessages.checkTypeInvalid }]);
  }
  const value = type === 'email' ? normalizeEmail(query.value) : asTrimmedString(query.value);
  if (!value) throw invalidInput([{ field: 'value', message: memberMessages.checkValueRequired }]);

  const message = fieldRules[type](value);
  if (message) throw invalidInput([{ field: 'value', message }]);

  return { type, value };
}

/**
 * 로그인 요청 본문을 검증합니다. 형식이 틀린 아이디·비밀번호는 어차피 일치하지 않으므로
 * 가입 규칙(패턴)은 검사하지 않고, 비어 있는지만 확인합니다.
 * @returns {{ userId: string, password: string, rememberMe: boolean }}
 */
function validateLogin(body) {
  const source = body && typeof body === 'object' ? body : {};
  const userId = asTrimmedString(source.userId);
  const password = typeof source.password === 'string' ? source.password : '';
  const rememberMe = source.rememberMe ?? false;

  const fields = [];
  if (!userId) fields.push({ field: 'userId', message: memberMessages.userIdRequired });
  if (!password) fields.push({ field: 'password', message: memberMessages.passwordRequired });
  if (typeof rememberMe !== 'boolean') fields.push({ field: 'rememberMe', message: memberMessages.rememberMeInvalid });
  if (fields.length > 0) throw invalidInput(fields);

  return { userId, password, rememberMe };
}

/** 토큰 재발급 요청 본문 `{ refreshToken }` 을 검증합니다. */
function validateRefresh(body) {
  const refreshToken = body && typeof body === 'object' ? asTrimmedString(body.refreshToken) : '';
  if (!refreshToken) throw invalidInput([{ field: 'refreshToken', message: memberMessages.refreshTokenRequired }]);
  return { refreshToken };
}

/** 아이디·비밀번호 찾기의 공통 입력 email (가입 때처럼 소문자로 맞춰 비교) */
function collectRecoveryEmail(source, fields) {
  const email = normalizeEmail(source.email);
  const emailMessage = fieldRules.email(email);
  if (emailMessage) fields.push({ field: 'email', message: emailMessage });
  return email;
}

/** 아이디 찾기 `{ nickname, email }` */
function validateFindId(body) {
  const source = body && typeof body === 'object' ? body : {};
  const fields = [];
  const nickname = asTrimmedString(source.nickname);
  if (!nickname) fields.push({ field: 'nickname', message: memberMessages.nicknameRequired });
  const email = collectRecoveryEmail(source, fields);
  if (fields.length > 0) throw invalidInput(fields);
  return { nickname, email };
}

/** 비밀번호 찾기 `{ userId, email }` */
function validateFindPassword(body) {
  const source = body && typeof body === 'object' ? body : {};
  const fields = [];
  const userId = asTrimmedString(source.userId);
  if (!userId) fields.push({ field: 'userId', message: memberMessages.userIdRequired });
  const email = collectRecoveryEmail(source, fields);
  if (fields.length > 0) throw invalidInput(fields);
  return { userId, email };
}

/** 비밀번호 재설정 `{ resetToken, newPassword }` — 새 비밀번호는 회원가입과 같은 규칙 */
function validateResetPassword(body) {
  const source = body && typeof body === 'object' ? body : {};
  const fields = [];
  const resetToken = asTrimmedString(source.resetToken);
  if (!resetToken) fields.push({ field: 'resetToken', message: memberMessages.resetTokenRequired });
  const newPassword = typeof source.newPassword === 'string' ? source.newPassword : '';
  const passwordMessage = fieldRules.password(newPassword);
  if (passwordMessage) fields.push({ field: 'newPassword', message: passwordMessage });
  if (fields.length > 0) throw invalidInput(fields);
  return { resetToken, newPassword };
}

module.exports = {
  validateSignup,
  validateCheckQuery,
  validateLogin,
  validateRefresh,
  validateFindId,
  validateFindPassword,
  validateResetPassword,
};
