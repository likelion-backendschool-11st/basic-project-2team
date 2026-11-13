'use strict';

const { agreementTypes, duplicateErrors } = require('./memberConstants');

/** 컬럼 이름은 SQL 에 직접 들어가므로 이 목록에 있는 값만 허용합니다. */
const UNIQUE_COLUMNS = new Set(Object.keys(duplicateErrors));

/**
 * member · member_agreement · member_withdrawal 테이블 접근.
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

  return { existsBy, hasActiveRejoinBlock, createMember };
}

module.exports = { createMemberRepository };
