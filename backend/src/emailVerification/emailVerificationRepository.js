'use strict';

/**
 * email_verification 테이블 접근.
 * @param {import('mysql2/promise').Pool} pool
 */
function createEmailVerificationRepository(pool) {
  /** 해당 이메일로 가장 최근에 보낸 인증코드 */
  async function findLatestByEmail(email) {
    const [rows] = await pool.query(
      `SELECT id, code_hash, attempt_count, expires_at, verified_at, created_at
         FROM email_verification
        WHERE email = ?
        ORDER BY created_at DESC, id DESC
        LIMIT 1`,
      [email],
    );
    const row = rows[0];
    return row
      ? {
          id: row.id,
          codeHash: row.code_hash,
          attemptCount: row.attempt_count,
          expiresAt: row.expires_at,
          verifiedAt: row.verified_at,
          createdAt: row.created_at,
        }
      : null;
  }

  /** created_at 은 재발송 제한에 쓰므로 DB 기본값 대신 앱 시각(UTC)으로 넣습니다. */
  async function create({ email, codeHash, expiresAt, now }) {
    await pool.query(
      'INSERT INTO email_verification (email, code_hash, expires_at, created_at) VALUES (?, ?, ?, ?)',
      [email, codeHash, expiresAt, now],
    );
  }

  /**
   * 확인 시도 1회를 먼저 차감합니다. 이미 maxAttempts 번 시도했으면 false.
   * 동시에 여러 번 요청해도 횟수 제한을 넘지 못하도록 조건부 UPDATE 로 처리합니다.
   */
  async function reserveAttempt({ id, maxAttempts }) {
    const [result] = await pool.query(
      'UPDATE email_verification SET attempt_count = attempt_count + 1 WHERE id = ? AND attempt_count < ?',
      [id, maxAttempts],
    );
    return result.affectedRows > 0;
  }

  async function markVerified({ id, now }) {
    await pool.query('UPDATE email_verification SET verified_at = ? WHERE id = ? AND verified_at IS NULL', [now, id]);
  }

  return { findLatestByEmail, create, reserveAttempt, markVerified };
}

module.exports = { createEmailVerificationRepository };
