'use strict';

const { agreementTypes, duplicateErrors } = require('./memberConstants');

/** 컬럼 이름은 SQL 에 직접 들어가므로 이 목록에 있는 값만 허용합니다. */
const UNIQUE_COLUMNS = new Set(Object.keys(duplicateErrors));

/** 로그인·토큰 재발급에 필요한 member 컬럼 */
const AUTH_MEMBER_COLUMNS = `id, password_hash, nickname, status, suspended_until, locked_until,
  login_fail_count, level, manner_temp, avatar_url`;

/** member 행 → 서비스에서 쓰는 camelCase 객체. DECIMAL 은 문자열로 오므로 숫자로 바꿉니다. */
const toAuthMember = (row) =>
  row && {
    id: row.id,
    passwordHash: row.password_hash,
    nickname: row.nickname,
    status: row.status,
    suspendedUntil: row.suspended_until,
    lockedUntil: row.locked_until,
    loginFailCount: row.login_fail_count,
    level: row.level,
    mannerTemp: Number(row.manner_temp),
    avatarUrl: row.avatar_url,
  };

/**
 * member · member_agreement · member_withdrawal · refresh_token · password_reset_token 테이블 접근.
 * @param {import('mysql2/promise').Pool} pool
 */
function createMemberRepository(pool) {
  /** 해당 UNIQUE 컬럼에 같은 값이 이미 있는지 (탈퇴 회원은 NULL 이라 걸리지 않음) */
  async function existsBy(column, value) {
    if (!UNIQUE_COLUMNS.has(column)) throw new Error(`Unsupported column: ${column}`);
    const [rows] = await pool.query(`SELECT 1 FROM member WHERE ${column} = ? LIMIT 1`, [value]);
    return rows.length > 0;
  }

  /** 재가입 제한 기간이 남은 탈퇴 기록이 있는지 (WITHDRAW-004) */
  async function hasActiveRejoinBlock({ phoneHash, emailHash, now }) {
    const [rows] = await pool.query(
      `SELECT 1 FROM member_withdrawal
        WHERE (phone_hash = ? OR email_hash = ?)
          AND rejoin_blocked_until IS NOT NULL
          AND rejoin_blocked_until > ?
        LIMIT 1`,
      [phoneHash, emailHash, now],
    );
    return rows.length > 0;
  }

  /** 회원과 약관 동의 이력을 한 트랜잭션으로 저장하고 새 회원 id 를 반환합니다. */
  async function createMember({ member, agreements, termsVersion, now }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.query(
        `INSERT INTO member (login_id, password_hash, nickname, email, phone, name)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [member.userId, member.passwordHash, member.nickname, member.email, member.phone, member.name],
      );
      const memberId = result.insertId;

      const agreementRows = Object.entries(agreementTypes).map(([key, type]) => [
        memberId,
        type,
        termsVersion,
        agreements[key],
        now,
      ]);
      await connection.query(
        'INSERT INTO member_agreement (member_id, agreement_type, terms_version, agreed, agreed_at) VALUES ?',
        [agreementRows],
      );

      await connection.commit();
      return memberId;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /** 로그인 아이디로 회원 조회 (탈퇴 회원은 login_id 가 NULL 이라 조회되지 않음) */
  async function findAuthMemberByLoginId(loginId) {
    const [rows] = await pool.query(`SELECT ${AUTH_MEMBER_COLUMNS} FROM member WHERE login_id = ? LIMIT 1`, [loginId]);
    return toAuthMember(rows[0]) ?? null;
  }

  async function findAuthMemberById(memberId) {
    const [rows] = await pool.query(`SELECT ${AUTH_MEMBER_COLUMNS} FROM member WHERE id = ? LIMIT 1`, [memberId]);
    return toAuthMember(rows[0]) ?? null;
  }

  /**
   * 로그인 실패 횟수를 1 늘리고, maxFailures 에 닿으면 locked_until 을 걸고 횟수를 0 으로 되돌립니다.
   * 동시 요청에도 횟수가 빠지지 않도록 현재 값을 기준으로 한 번에 갱신합니다.
   * (MySQL 은 SET 을 왼쪽부터 적용하므로 locked_until 을 먼저 계산합니다.)
   */
  async function recordLoginFailure({ memberId, maxFailures, lockedUntil }) {
    await pool.query(
      `UPDATE member
          SET locked_until = IF(login_fail_count + 1 >= ?, ?, locked_until),
              login_fail_count = IF(login_fail_count + 1 >= ?, 0, login_fail_count + 1)
        WHERE id = ?`,
      [maxFailures, lockedUntil, maxFailures, memberId],
    );
  }

  /** 로그인 성공: 실패 횟수·잠금 초기화, 마지막 로그인 시각 기록 */
  async function recordLoginSuccess({ memberId, now }) {
    await pool.query(
      'UPDATE member SET login_fail_count = 0, locked_until = NULL, last_login_at = ? WHERE id = ?',
      [now, memberId],
    );
  }

  async function saveRefreshToken({ memberId, tokenHash, expiresAt }) {
    await pool.query('INSERT INTO refresh_token (member_id, token_hash, expires_at) VALUES (?, ?, ?)', [
      memberId,
      tokenHash,
      expiresAt,
    ]);
  }

  async function findRefreshToken(tokenHash) {
    const [rows] = await pool.query(
      'SELECT id, member_id, expires_at, revoked_at FROM refresh_token WHERE token_hash = ? LIMIT 1',
      [tokenHash],
    );
    const row = rows[0];
    return row ? { id: row.id, memberId: row.member_id, expiresAt: row.expires_at, revokedAt: row.revoked_at } : null;
  }

  /** 토큰 하나를 폐기합니다. 이미 폐기된 토큰이면 false (동시에 재발급을 요청한 경우) */
  async function revokeRefreshToken({ id, now }) {
    const [result] = await pool.query(
      'UPDATE refresh_token SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL',
      [now, id],
    );
    return result.affectedRows > 0;
  }

  /** 회원의 유효한 Refresh Token 을 모두 폐기합니다 (로그아웃, 토큰 재사용 감지) */
  async function revokeAllRefreshTokens({ memberId, now }) {
    await pool.query('UPDATE refresh_token SET revoked_at = ? WHERE member_id = ? AND revoked_at IS NULL', [
      now,
      memberId,
    ]);
  }

  /** 아이디 찾기: 닉네임과 이메일이 모두 일치하는 회원의 login_id (탈퇴 회원은 둘 다 NULL 이라 제외) */
  async function findLoginIdByNicknameAndEmail({ nickname, email }) {
    const [rows] = await pool.query('SELECT login_id FROM member WHERE nickname = ? AND email = ? LIMIT 1', [
      nickname,
      email,
    ]);
    return rows[0]?.login_id ?? null;
  }

  /** 비밀번호 찾기: 아이디와 이메일이 모두 일치하는 회원 id */
  async function findMemberIdByLoginIdAndEmail({ loginId, email }) {
    const [rows] = await pool.query('SELECT id FROM member WHERE login_id = ? AND email = ? LIMIT 1', [
      loginId,
      email,
    ]);
    return rows[0]?.id ?? null;
  }

  async function savePasswordResetToken({ memberId, tokenHash, expiresAt }) {
    await pool.query('INSERT INTO password_reset_token (member_id, token_hash, expires_at) VALUES (?, ?, ?)', [
      memberId,
      tokenHash,
      expiresAt,
    ]);
  }

  async function findPasswordResetToken(tokenHash) {
    const [rows] = await pool.query(
      'SELECT id, member_id, expires_at, used_at FROM password_reset_token WHERE token_hash = ? LIMIT 1',
      [tokenHash],
    );
    const row = rows[0];
    return row ? { id: row.id, memberId: row.member_id, expiresAt: row.expires_at, usedAt: row.used_at } : null;
  }

  /**
   * 재설정 토큰을 사용 처리하고 비밀번호를 바꿉니다 (한 트랜잭션).
   * - 로그인 실패 횟수·잠금 초기화
   * - 아직 쓰지 않은 다른 재설정 토큰도 사용 처리
   * - 모든 Refresh Token 폐기 → 다른 기기의 로그인도 끊김 (docs/03-db-design.md refresh_token)
   * @returns {Promise<boolean>} 토큰이 이미 사용됐으면(동시 요청) false
   */
  async function resetPassword({ tokenId, memberId, passwordHash, now }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [used] = await connection.query(
        'UPDATE password_reset_token SET used_at = ? WHERE id = ? AND used_at IS NULL',
        [now, tokenId],
      );
      if (used.affectedRows === 0) {
        await connection.rollback();
        return false;
      }
      await connection.query(
        'UPDATE member SET password_hash = ?, login_fail_count = 0, locked_until = NULL WHERE id = ?',
        [passwordHash, memberId],
      );
      await connection.query(
        'UPDATE password_reset_token SET used_at = ? WHERE member_id = ? AND used_at IS NULL',
        [now, memberId],
      );
      await connection.query(
        'UPDATE refresh_token SET revoked_at = ? WHERE member_id = ? AND revoked_at IS NULL',
        [now, memberId],
      );
      await connection.commit();
      return true;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  return {
    existsBy,
    hasActiveRejoinBlock,
    createMember,
    findAuthMemberByLoginId,
    findAuthMemberById,
    recordLoginFailure,
    recordLoginSuccess,
    saveRefreshToken,
    findRefreshToken,
    revokeRefreshToken,
    revokeAllRefreshTokens,
    findLoginIdByNicknameAndEmail,
    findMemberIdByLoginIdAndEmail,
    savePasswordResetToken,
    findPasswordResetToken,
    resetPassword,
  };
}

module.exports = { createMemberRepository };
