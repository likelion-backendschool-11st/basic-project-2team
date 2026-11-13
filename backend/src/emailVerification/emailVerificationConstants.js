'use strict';

/** 이메일 인증코드 규칙 (email_verification 테이블, docs/03-db-design.md) */
const CODE_LENGTH = 6;
const CODE_PATTERN = /^\d{6}$/;
/** 인증코드 유효 시간 */
const CODE_TTL_MINUTES = 5;
/** 코드 하나당 확인 시도 횟수 (attempt_count) */
const MAX_VERIFY_ATTEMPTS = 5;
/** 같은 이메일로 다시 보내려면 기다려야 하는 시간 */
const RESEND_INTERVAL_SECONDS = 60;

const emailVerificationMessages = Object.freeze({
  codeRequired: '인증코드를 입력해주세요.',
  codeInvalid: `인증코드는 숫자 ${CODE_LENGTH}자리입니다.`,
  sendTooFrequent: `인증코드는 ${RESEND_INTERVAL_SECONDS}초에 한 번만 요청할 수 있습니다. 잠시 후 다시 시도해주세요.`,
  sendFailed: '인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해주세요.',
  codeExpired: '인증코드가 없거나 만료되었습니다. 인증코드를 다시 요청해주세요.',
  attemptsExceeded: '인증 시도 횟수를 초과했습니다. 인증코드를 다시 요청해주세요.',
  codeMismatch: '인증코드가 일치하지 않습니다.',
});

/** 인증 메일 내용 */
const verificationMail = Object.freeze({
  subject: '[OurParty] 이메일 인증코드 안내',
  text: (code) =>
    [
      'OurParty 이메일 인증코드입니다.',
      '',
      `인증코드: ${code}`,
      '',
      `${CODE_TTL_MINUTES}분 안에 입력해주세요.`,
      '본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.',
    ].join('\n'),
});

module.exports = {
  CODE_LENGTH,
  CODE_PATTERN,
  CODE_TTL_MINUTES,
  MAX_VERIFY_ATTEMPTS,
  RESEND_INTERVAL_SECONDS,
  emailVerificationMessages,
  verificationMail,
};
