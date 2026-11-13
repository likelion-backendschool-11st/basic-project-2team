'use strict';

const { ApiError } = require('../common/ApiError');
const { EMAIL_PATTERN, EMAIL_MAX_LENGTH, memberMessages } = require('../member/memberConstants');
const { CODE_PATTERN, emailVerificationMessages } = require('./emailVerificationConstants');

const asTrimmedString = (value) => (typeof value === 'string' ? value.trim() : '');
const sourceOf = (body) => (body && typeof body === 'object' ? body : {});

const invalidInput = (fields) => new ApiError(400, 'INVALID_INPUT', memberMessages.invalidInput, fields);

/** 이메일은 회원가입과 같은 규칙으로 검사하고 소문자로 맞춥니다. 오류 메시지 또는 null */
function emailError(email) {
  if (!email) return memberMessages.emailRequired;
  return email.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(email) ? null : memberMessages.emailInvalid;
}

/** POST /api/auth/email/send 본문 `{ email }` */
function validateSendCode(body) {
  const email = asTrimmedString(sourceOf(body).email).toLowerCase();
  const message = emailError(email);
  if (message) throw invalidInput([{ field: 'email', message }]);
  return { email };
}

/** POST /api/auth/email/verify 본문 `{ email, code }` */
function validateVerifyCode(body) {
  const source = sourceOf(body);
  const email = asTrimmedString(source.email).toLowerCase();
  const code = asTrimmedString(source.code);

  const fields = [];
  const message = emailError(email);
  if (message) fields.push({ field: 'email', message });
  if (!code) fields.push({ field: 'code', message: emailVerificationMessages.codeRequired });
  else if (!CODE_PATTERN.test(code)) fields.push({ field: 'code', message: emailVerificationMessages.codeInvalid });
  if (fields.length > 0) throw invalidInput(fields);

  return { email, code };
}

module.exports = { validateSendCode, validateVerifyCode };
