'use strict';

/** 회원가입 입력 규칙 (docs/02-requirements.md SIGNUP, docs/03-db-design.md 2.1·6절) */
const LOGIN_ID_PATTERN = /^[a-z0-9]{4,20}$/;
/** 영문·숫자·특수문자(!@#)를 모두 포함한 8~12자. 다른 특수문자는 허용하지 않음 */
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#])[A-Za-z\d!@#]{8,12}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** 하이픈을 뺀 휴대폰 번호 (010·011·016~019) */
const PHONE_PATTERN = /^01[016-9]\d{7,8}$/;

const NICKNAME_MIN_LENGTH = 2;
const NICKNAME_MAX_LENGTH = 10;
const EMAIL_MAX_LENGTH = 100;
const NAME_MAX_LENGTH = 50;

/** member_agreement.terms_version 에 기록할 현재 약관 버전 */
const TERMS_VERSION = 'v1';

/** API 요청의 agreements 키 → member_agreement.agreement_type */
const agreementTypes = Object.freeze({
  terms: 'TERMS',
  privacy: 'PRIVACY',
  marketing: 'MARKETING',
});
const requiredAgreementKeys = Object.freeze(['terms', 'privacy']);

/** GET /api/auth/check 의 type → member 컬럼 */
const checkTypeColumns = Object.freeze({
  userId: 'login_id',
  nickname: 'nickname',
  email: 'email',
});

/** 중복 시 응답할 에러 (member 컬럼 / UNIQUE 제약 이름 기준) */
const duplicateErrors = Object.freeze({
  login_id: { constraint: 'uq_member_login_id', code: 'DUPLICATE_LOGIN_ID', message: '이미 사용 중인 아이디입니다.' },
  nickname: { constraint: 'uq_member_nickname', code: 'DUPLICATE_NICKNAME', message: '이미 사용 중인 닉네임입니다.' },
  email: { constraint: 'uq_member_email', code: 'DUPLICATE_EMAIL', message: '이미 가입된 이메일입니다.' },
  phone: { constraint: 'uq_member_phone', code: 'DUPLICATE_PHONE', message: '이미 가입된 휴대폰 번호입니다.' },
});

/** 로그인 실패 잠금 (REQ-LOGIN-006): 연속 실패 횟수와 잠금 시간 */
const MAX_LOGIN_FAILURES = 5;
const LOGIN_LOCK_MINUTES = 10;

/** member.status 값 (docs/04-erd.md) */
const memberStatus = Object.freeze({
  active: 'ACTIVE',
  warned: 'WARNED',
  suspended: 'SUSPENDED',
  banned: 'BANNED',
  withdrawn: 'WITHDRAWN',
});

/** 로그인을 막는 sanction.type (경고 WARNING 은 로그인을 막지 않음) */
const restrictionType = Object.freeze({ suspend: 'SUSPEND', ban: 'BAN' });

const memberMessages = Object.freeze({
  invalidInput: '입력값을 확인해주세요.',
  userIdRequired: '아이디를 입력해주세요.',
  userIdInvalid: '아이디는 영문 소문자와 숫자 4~20자로 입력해주세요.',
  nicknameRequired: '닉네임을 입력해주세요.',
  nicknameInvalid: `닉네임은 공백 없이 ${NICKNAME_MIN_LENGTH}~${NICKNAME_MAX_LENGTH}자로 입력해주세요.`,
  passwordRequired: '비밀번호를 입력해주세요.',
  passwordInvalid: '비밀번호는 영문, 숫자, 특수문자(!, @, #)를 모두 포함한 8~12자로 입력해주세요.',
  emailRequired: '이메일을 입력해주세요.',
  emailInvalid: '올바른 이메일 형식이 아닙니다.',
  phoneRequired: '휴대폰 번호를 입력해주세요.',
  phoneInvalid: '올바른 휴대폰 번호 형식이 아닙니다. (예: 010-1234-5678)',
  nameInvalid: `이름은 ${NAME_MAX_LENGTH}자 이하로 입력해주세요.`,
  agreementsInvalid: '약관 동의 정보가 올바르지 않습니다.',
  requiredTermsNotAgreed: '필수 약관에 모두 동의해주셔야 가입이 진행됩니다.',
  checkTypeInvalid: 'type 은 userId, nickname, email 중 하나여야 합니다.',
  checkValueRequired: '확인할 값을 입력해주세요.',
  rejoinRestricted: '탈퇴 후 재가입이 제한된 정보입니다. 고객센터로 문의해주세요.',
  rememberMeInvalid: 'rememberMe 는 true 또는 false 여야 합니다.',
  refreshTokenRequired: 'refreshToken 을 입력해주세요.',
  // 아이디와 비밀번호 중 무엇이 틀렸는지 구분하지 않음 (REQ-LOGIN-006)
  invalidCredentials: '아이디 또는 비밀번호가 일치하지 않습니다.',
  accountLocked: `로그인에 ${MAX_LOGIN_FAILURES}회 연속 실패해 계정이 잠겼습니다. ${LOGIN_LOCK_MINUTES}분 후 다시 시도해주세요.`,
  accountSuspended: '이용이 정지된 계정입니다.',
  accountBanned: '영구 정지된 계정입니다.',
  invalidRefreshToken: '로그인이 만료되었습니다. 다시 로그인해주세요.',
  memberNotFound: '입력하신 정보와 일치하는 회원이 없습니다.',
  resetTokenRequired: 'resetToken 을 입력해주세요.',
  invalidResetToken: '비밀번호 재설정 시간이 만료되었습니다. 처음부터 다시 진행해주세요.',
});

module.exports = {
  LOGIN_ID_PATTERN,
  PASSWORD_PATTERN,
  EMAIL_PATTERN,
  PHONE_PATTERN,
  NICKNAME_MIN_LENGTH,
  NICKNAME_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  TERMS_VERSION,
  agreementTypes,
  requiredAgreementKeys,
  checkTypeColumns,
  duplicateErrors,
  MAX_LOGIN_FAILURES,
  LOGIN_LOCK_MINUTES,
  memberStatus,
  restrictionType,
  memberMessages,
};
