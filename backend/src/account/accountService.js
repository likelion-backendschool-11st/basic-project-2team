'use strict';

const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { ApiError } = require('../common/ApiError');
const { duplicateErrors, memberStatus } = require('../member/memberConstants');
const {
  WITHDRAWAL_PURGE_DAYS,
  SANCTION_REJOIN_BLOCK_MONTHS,
  PERMANENT_BLOCK_UNTIL,
  SANCTION_TYPES,
  accountMessages,
} = require('./accountConstants');
const { validateProfileUpdate, validatePasswordChange, validateWithdraw } = require('./accountValidator');

const DAY_MS = 24 * 60 * 60 * 1000;

/** 회원가입의 재가입 제한 확인(memberService)과 같은 방식(SHA-256 hex)이어야 합니다. */
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const toIso = (value) => (value ? new Date(value).toISOString() : null);

const unauthorized = () => new ApiError(401, 'UNAUTHORIZED', accountMessages.unauthorized);
const invalidPassword = () => new ApiError(400, 'INVALID_PASSWORD', accountMessages.invalidPassword);
const duplicateNickname = () => new ApiError(409, duplicateErrors.nickname.code, duplicateErrors.nickname.message);

/** 동시에 같은 닉네임으로 바꿔 사전 확인을 통과한 경우, DB UNIQUE 위반을 409 로 바꿉니다. */
const isDuplicateNickname = (err) =>
  err?.code === 'ER_DUP_ENTRY' && String(err.sqlMessage ?? err.message).includes(duplicateErrors.nickname.constraint);

/** DB 행 → 내 정보 응답 (docs/API_SPEC.md 2절 「내 정보」) */
const toMe = (account, games) => ({
  id: account.id,
  userId: account.loginId,
  nickname: account.nickname,
  email: account.email,
  phone: account.phone,
  name: account.name ?? null,
  bio: account.bio ?? null,
  ageRange: account.ageRange ?? null,
  ageRangePublic: Boolean(account.ageRangePublic),
  avatarUrl: account.avatarUrl ?? null,
  level: account.level,
  mannerTemp: Number(account.mannerTemp),
  games: games.map((game) => ({
    code: game.code,
    name: game.name,
    isMain: Boolean(game.isMain),
    playStyle: game.playStyle ?? null,
  })),
  createdAt: toIso(account.createdAt),
});

/**
 * 제재 이력에 따른 재가입 제한·파기 예정일 (docs/03-db-design.md 6절 결정 사항 10·11)
 * @param {string[]} sanctionTypes
 * @param {Date} now
 */
function planWithdrawal(sanctionTypes, now) {
  if (sanctionTypes.length === 0) {
    return { hadSanction: false, rejoinBlockedUntil: null, purgeAt: new Date(now.getTime() + WITHDRAWAL_PURGE_DAYS * DAY_MS) };
  }
  let rejoinBlockedUntil = PERMANENT_BLOCK_UNTIL;
  if (!sanctionTypes.includes(SANCTION_TYPES.ban)) {
    rejoinBlockedUntil = new Date(now);
    rejoinBlockedUntil.setUTCMonth(rejoinBlockedUntil.getUTCMonth() + SANCTION_REJOIN_BLOCK_MONTHS);
  }
  return { hadSanction: true, rejoinBlockedUntil, purgeAt: rejoinBlockedUntil };
}

/**
 * 내 정보 조회 · 프로필 수정 · 비밀번호 변경 · 회원 탈퇴 비즈니스 로직.
 * @param {{
 *   accountRepository: ReturnType<typeof import('./accountRepository').createAccountRepository>,
 *   bcryptRounds: number,
 *   now?: () => Date,
 * }} deps
 */
function createAccountService({ accountRepository, bcryptRounds, now = () => new Date() }) {
  /** 토큰은 유효하지만 탈퇴한(또는 없는) 회원이면 401 */
  async function findActiveAccount(memberId) {
    const account = await accountRepository.findAccount(memberId);
    if (!account || account.status === memberStatus.withdrawn) throw unauthorized();
    return account;
  }

  async function assertPassword(account, password) {
    if (!account.passwordHash || !(await bcrypt.compare(password, account.passwordHash))) throw invalidPassword();
  }

  /** GET /api/members/me */
  async function getMe(memberId) {
    const account = await findActiveAccount(memberId);
    return toMe(account, await accountRepository.findGameProfiles(memberId));
  }

  /** PATCH /api/members/me — 보낸 항목만 바꾸고, 바뀐 내 정보를 돌려줍니다. */
  async function updateProfile(memberId, body) {
    const input = validateProfileUpdate(body);
    const account = await findActiveAccount(memberId);

    const fields = { ...input };
    delete fields.games;
    if (fields.nickname === account.nickname) delete fields.nickname;
    if (fields.nickname && (await accountRepository.existsNicknameOfOther(fields.nickname, memberId))) {
      throw duplicateNickname();
    }

    let games;
    if (input.games) {
      const { codes, mainGame, playStyle } = input.games;
      const ids = await accountRepository.findGameIdsByCodes(codes);
      if (codes.some((code) => !ids.has(code))) {
        throw new ApiError(400, 'INVALID_INPUT', accountMessages.invalidInput, [
          { field: 'games', message: accountMessages.gameNotFound },
        ]);
      }
      games = {
        entries: codes.map((code) => ({ gameId: ids.get(code), isMain: code === mainGame })),
        playStyle,
      };
    }

    try {
      await accountRepository.updateProfile({ memberId, fields, games });
    } catch (err) {
      if (isDuplicateNickname(err)) throw duplicateNickname();
      throw err;
    }
    return getMe(memberId);
  }

  /** PATCH /api/members/me/password — 바꾸면 모든 기기의 Refresh Token 이 폐기되어 다시 로그인해야 합니다. */
  async function changePassword(memberId, body) {
    const { currentPassword, newPassword } = validatePasswordChange(body);
    const account = await findActiveAccount(memberId);
    await assertPassword(account, currentPassword);
    if (await bcrypt.compare(newPassword, account.passwordHash)) {
      throw new ApiError(400, 'SAME_PASSWORD', accountMessages.samePassword);
    }
    const passwordHash = await bcrypt.hash(newPassword, bcryptRounds);
    await accountRepository.updatePassword({ memberId, passwordHash, now: now() });
  }

  /** DELETE /api/members/me — 비밀번호 재확인 후 진행 중인 파티가 없으면 탈퇴 처리합니다. */
  async function withdraw(memberId, body) {
    const { password, reason } = validateWithdraw(body);
    const account = await findActiveAccount(memberId);
    await assertPassword(account, password);

    const active = await accountRepository.countActiveParties(memberId);
    if (active.hosting > 0 || active.joined > 0) {
      throw new ApiError(409, 'ACTIVE_PARTY_EXISTS', accountMessages.activePartyExists);
    }

    const current = now();
    const plan = planWithdrawal(await accountRepository.findSanctionTypes(memberId), current);
    const withdrawn = await accountRepository.withdraw({
      memberId,
      withdrawal: {
        phoneHash: account.phone ? sha256(account.phone) : null,
        emailHash: account.email ? sha256(account.email) : null,
        reason,
        ...plan,
      },
      now: current,
    });
    if (!withdrawn) throw unauthorized();
  }

  return { getMe, updateProfile, changePassword, withdraw };
}

module.exports = { createAccountService };
