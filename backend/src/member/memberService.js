'use strict';

const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { ApiError } = require('../common/ApiError');
const { TERMS_VERSION, checkTypeColumns, duplicateErrors, memberMessages } = require('./memberConstants');
const { validateSignup, validateCheckQuery } = require('./memberValidator');

/** member_withdrawal 의 phone_hash / email_hash 와 같은 방식(SHA-256 hex) */
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const duplicateError = (column) => {
  const { code, message } = duplicateErrors[column];
  return new ApiError(409, code, message);
};

/** 동시에 가입해 사전 확인을 통과한 경우, DB UNIQUE 위반을 409 로 바꿉니다. */
function toDuplicateError(err) {
  if (!err || err.code !== 'ER_DUP_ENTRY') return null;
  const column = Object.keys(duplicateErrors).find((key) =>
    String(err.sqlMessage ?? err.message).includes(duplicateErrors[key].constraint),
  );
  return column ? duplicateError(column) : null;
}

/**
 * 회원가입 · 중복 확인 비즈니스 로직.
 * @param {{ memberRepository: ReturnType<typeof import('./memberRepository').createMemberRepository>, bcryptRounds: number, now?: () => Date }} deps
 */
function createMemberService({ memberRepository, bcryptRounds, now = () => new Date() }) {
  /** GET /api/auth/check */
  async function checkAvailability(query) {
    const { type, value } = validateCheckQuery(query);
    const exists = await memberRepository.existsBy(checkTypeColumns[type], value);
    return { available: !exists };
  }

  /** POST /api/auth/signup */
  async function signup(body) {
    const input = validateSignup(body);
    const current = now();

    const blocked = await memberRepository.hasActiveRejoinBlock({
      phoneHash: sha256(input.phone),
      emailHash: sha256(input.email),
      now: current,
    });
    if (blocked) throw new ApiError(403, 'REJOIN_RESTRICTED', memberMessages.rejoinRestricted);

    const uniqueValues = { login_id: input.userId, nickname: input.nickname, email: input.email, phone: input.phone };
    for (const [column, value] of Object.entries(uniqueValues)) {
      if (await memberRepository.existsBy(column, value)) throw duplicateError(column);
    }

    const passwordHash = await bcrypt.hash(input.password, bcryptRounds);

    let memberId;
    try {
      memberId = await memberRepository.createMember({
        member: { ...input, passwordHash },
        agreements: input.agreements,
        termsVersion: TERMS_VERSION,
        now: current,
      });
    } catch (err) {
      throw toDuplicateError(err) ?? err;
    }

    return { id: memberId, userId: input.userId, nickname: input.nickname };
  }

  return { checkAvailability, signup };
}

module.exports = { createMemberService };
