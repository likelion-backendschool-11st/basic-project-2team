'use strict';

const crypto = require('node:crypto');
const { ApiError } = require('../common/ApiError');
const {
  CODE_LENGTH,
  CODE_TTL_MINUTES,
  MAX_VERIFY_ATTEMPTS,
  RESEND_INTERVAL_SECONDS,
  emailVerificationMessages,
  verificationMail,
} = require('./emailVerificationConstants');
const { validateSendCode, validateVerifyCode } = require('./emailVerificationValidator');

/** email_verification.code_hash (CHAR(64)) 에 저장하는 SHA-256 hex */
const hashCode = (code) => crypto.createHash('sha256').update(code).digest('hex');

/** 앞자리 0 을 포함한 무작위 6자리 숫자 */
const generateCode = () => String(crypto.randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');

/** 해시 문자열을 비교 시간이 일정하게 비교합니다. */
const hashesEqual = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * 이메일 인증코드 발송·확인. 확인에 성공하면 이메일 인증 토큰(JWT)을 발급하고,
 * 아이디 찾기·비밀번호 찾기에서 이 토큰으로 이메일 소유를 확인합니다.
 * 가입 여부와 관계없이 발송하므로 응답으로 회원 존재 여부를 알 수 없습니다.
 * @param {{
 *   emailVerificationRepository: ReturnType<typeof import('./emailVerificationRepository').createEmailVerificationRepository>,
 *   tokenProvider: ReturnType<typeof import('../common/tokenProvider').createTokenProvider>,
 *   mailer: ReturnType<typeof import('../common/mailer').createMailer>,
 *   now?: () => Date,
 * }} deps
 */
function createEmailVerificationService({ emailVerificationRepository, tokenProvider, mailer, now = () => new Date() }) {
  /** POST /api/auth/email/send */
  async function sendCode(body) {
    const { email } = validateSendCode(body);
    const current = now();

    const latest = await emailVerificationRepository.findLatestByEmail(email);
    if (latest && current.getTime() - latest.createdAt.getTime() < RESEND_INTERVAL_SECONDS * 1000) {
      throw new ApiError(429, 'EMAIL_SEND_TOO_FREQUENT', emailVerificationMessages.sendTooFrequent);
    }

    const code = generateCode();
    try {
      await mailer.sendMail({ to: email, subject: verificationMail.subject, text: verificationMail.text(code) });
    } catch (err) {
      console.error(err);
      throw new ApiError(502, 'EMAIL_SEND_FAILED', emailVerificationMessages.sendFailed);
    }

    await emailVerificationRepository.create({
      email,
      codeHash: hashCode(code),
      expiresAt: new Date(current.getTime() + CODE_TTL_MINUTES * 60 * 1000),
      now: current,
    });
    return { expiresInSeconds: CODE_TTL_MINUTES * 60 };
  }

  /** POST /api/auth/email/verify — 가장 최근에 보낸 코드만 유효합니다. */
  async function verifyCode(body) {
    const { email, code } = validateVerifyCode(body);
    const current = now();

    const latest = await emailVerificationRepository.findLatestByEmail(email);
    if (!latest || latest.expiresAt <= current) {
      throw new ApiError(400, 'VERIFICATION_CODE_EXPIRED', emailVerificationMessages.codeExpired);
    }
    if (!(await emailVerificationRepository.reserveAttempt({ id: latest.id, maxAttempts: MAX_VERIFY_ATTEMPTS }))) {
      throw new ApiError(429, 'VERIFICATION_ATTEMPTS_EXCEEDED', emailVerificationMessages.attemptsExceeded);
    }
    if (!hashesEqual(hashCode(code), latest.codeHash)) {
      throw new ApiError(400, 'INVALID_VERIFICATION_CODE', emailVerificationMessages.codeMismatch);
    }

    await emailVerificationRepository.markVerified({ id: latest.id, now: current });
    const { token, expiresAt } = tokenProvider.createEmailVerificationToken({ email, now: current });
    return { verified: true, verificationToken: token, expiresAt: expiresAt.toISOString() };
  }

  return { sendCode, verifyCode };
}

module.exports = { createEmailVerificationService };
