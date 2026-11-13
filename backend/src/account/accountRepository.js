'use strict';

/** 프로필 수정에서 바꿀 수 있는 member 컬럼 (SQL 에 직접 들어가므로 이 목록의 값만 씁니다) */
const PROFILE_COLUMNS = Object.freeze({
  nickname: 'nickname',
  bio: 'bio',
  ageRange: 'age_range',
  ageRangePublic: 'age_range_public',
});

/** 탈퇴를 막는 「진행 중인 파티」: 모집 중이거나 마감됐지만 아직 완료되지 않은 공고 */
const ACTIVE_POST = "p.deleted_at IS NULL AND p.status IN ('OPEN', 'CLOSED')";

/** 트랜잭션 하나로 fn 을 실행합니다. fn 이 false 를 돌려주면 롤백합니다. */
async function inTransaction(pool, fn) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    if (result === false) await connection.rollback();
    else await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * 내 정보 조회·프로필 수정·비밀번호 변경·회원 탈퇴용 테이블 접근:
 * member · member_game_profile · game · refresh_token · password_reset_token · post · post_application · sanction ·
 * member_withdrawal · favorite_member · post_scrap · post_draft · notification_subscription
 * @param {import('mysql2/promise').Pool} pool
 */
function createAccountRepository(pool) {
  /** 내 계정 정보. 없으면 null */
  async function findAccount(memberId) {
    const [rows] = await pool.query(
      `SELECT id, login_id AS loginId, password_hash AS passwordHash, nickname, email, phone, name, bio,
              age_range AS ageRange, age_range_public AS ageRangePublic, avatar_url AS avatarUrl,
              level, manner_temp AS mannerTemp, status, created_at AS createdAt
         FROM member
        WHERE id = ?
        LIMIT 1`,
      [memberId],
    );
    return rows[0] ?? null;
  }

  /** 게이머 프로필 (대표 게임이 먼저) */
  async function findGameProfiles(memberId) {
    const [rows] = await pool.query(
      `SELECT g.code, g.name, mgp.is_main AS isMain, mgp.play_style AS playStyle
         FROM member_game_profile mgp
         JOIN game g ON g.id = mgp.game_id
        WHERE mgp.member_id = ?
        ORDER BY mgp.is_main DESC, g.sort_order, g.id`,
      [memberId],
    );
    return rows;
  }

  /** 활성 게임 코드 → id. 없거나 비활성인 코드는 결과에 없습니다. */
  async function findGameIdsByCodes(codes) {
    const ids = new Map();
    if (codes.length === 0) return ids;
    const [rows] = await pool.query('SELECT id, code FROM game WHERE code IN (?) AND is_active = TRUE', [codes]);
    for (const row of rows) ids.set(row.code, row.id);
    return ids;
  }

  /** 다른 회원이 이미 쓰는 닉네임인지 */
  async function existsNicknameOfOther(nickname, memberId) {
    const [rows] = await pool.query('SELECT 1 FROM member WHERE nickname = ? AND id <> ? LIMIT 1', [nickname, memberId]);
    return rows.length > 0;
  }

  /**
   * 프로필 수정 (한 트랜잭션).
   * @param {{
   *   memberId: number,
   *   fields: { nickname?: string, bio?: string | null, ageRange?: string | null, ageRangePublic?: boolean },
   *   games?: { entries: { gameId: number, isMain: boolean }[], playStyle: string | null },
   * }} update games 가 있으면 게이머 프로필을 그 목록으로 교체합니다 (남는 게임의 캐릭터 정보는 유지).
   */
  async function updateProfile({ memberId, fields, games }) {
    await inTransaction(pool, async (connection) => {
      const entries = Object.entries(fields).filter(([key]) => Object.hasOwn(PROFILE_COLUMNS, key));
      if (entries.length > 0) {
        const assignments = entries.map(([key]) => `${PROFILE_COLUMNS[key]} = ?`).join(', ');
        await connection.query(`UPDATE member SET ${assignments} WHERE id = ?`, [
          ...entries.map(([, value]) => value),
          memberId,
        ]);
      }

      if (games) {
        const gameIds = games.entries.map((entry) => entry.gameId);
        if (gameIds.length === 0) {
          await connection.query('DELETE FROM member_game_profile WHERE member_id = ?', [memberId]);
        } else {
          await connection.query('DELETE FROM member_game_profile WHERE member_id = ? AND game_id NOT IN (?)', [
            memberId,
            gameIds,
          ]);
          await connection.query(
            `INSERT INTO member_game_profile (member_id, game_id, is_main, play_style) VALUES ?
             ON DUPLICATE KEY UPDATE is_main = VALUES(is_main), play_style = VALUES(play_style)`,
            [games.entries.map((entry) => [memberId, entry.gameId, entry.isMain, games.playStyle])],
          );
        }
      }
    });
  }

  /**
   * 비밀번호 변경 (한 트랜잭션): 로그인 실패 횟수·잠금 초기화, 쓰지 않은 재설정 토큰 사용 처리,
   * 모든 Refresh Token 폐기 → 모든 기기에서 다시 로그인해야 합니다.
   */
  async function updatePassword({ memberId, passwordHash, now }) {
    await inTransaction(pool, async (connection) => {
      await connection.query(
        'UPDATE member SET password_hash = ?, login_fail_count = 0, locked_until = NULL WHERE id = ?',
        [passwordHash, memberId],
      );
      await connection.query('UPDATE password_reset_token SET used_at = ? WHERE member_id = ? AND used_at IS NULL', [
        now,
        memberId,
      ]);
      await connection.query('UPDATE refresh_token SET revoked_at = ? WHERE member_id = ? AND revoked_at IS NULL', [
        now,
        memberId,
      ]);
    });
  }

  /** 진행 중인 파티 수: 내가 파티장인 공고(hosting), 승인돼 참여 중인 공고(joined) */
  async function countActiveParties(memberId) {
    const [rows] = await pool.query(
      `SELECT (SELECT COUNT(*) FROM post p WHERE p.author_id = ? AND ${ACTIVE_POST}) AS hosting,
              (SELECT COUNT(*) FROM post_application pa JOIN post p ON p.id = pa.post_id
                WHERE pa.applicant_id = ? AND pa.status = 'ACCEPTED' AND ${ACTIVE_POST}) AS joined`,
      [memberId, memberId],
    );
    return { hosting: Number(rows[0].hosting), joined: Number(rows[0].joined) };
  }

  /** 받은 적 있는 제재 종류 (해제된 제재도 이력으로 봅니다) */
  async function findSanctionTypes(memberId) {
    const [rows] = await pool.query('SELECT DISTINCT type FROM sanction WHERE member_id = ?', [memberId]);
    return rows.map((row) => row.type);
  }

  /**
   * 회원 탈퇴 (한 트랜잭션, docs/03-db-design.md 5절 삭제 정책).
   * - member_withdrawal 에 해시·재가입 제한·파기 예정일 보관
   * - member 는 소프트 삭제: status WITHDRAWN, 개인정보 컬럼 NULL (공고·댓글·리뷰는 「탈퇴한 회원」으로 남음)
   * - 대기 중인 신청 취소, 게이머 프로필·즐겨찾기(양방향)·스크랩·임시저장·알림 설정 삭제, 토큰 폐기
   * @returns {Promise<boolean>} 이미 탈퇴한 회원이면(동시 요청) false
   */
  async function withdraw({ memberId, withdrawal, now }) {
    return inTransaction(pool, async (connection) => {
      const [locked] = await connection.query('SELECT status FROM member WHERE id = ? FOR UPDATE', [memberId]);
      if (!locked[0] || locked[0].status === 'WITHDRAWN') return false;

      await connection.query(
        `INSERT INTO member_withdrawal
           (member_id, phone_hash, email_hash, reason, had_sanction, rejoin_blocked_until, purge_at, withdrawn_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          memberId,
          withdrawal.phoneHash,
          withdrawal.emailHash,
          withdrawal.reason,
          withdrawal.hadSanction,
          withdrawal.rejoinBlockedUntil,
          withdrawal.purgeAt,
          now,
        ],
      );
      await connection.query(
        `UPDATE member
            SET status = 'WITHDRAWN', withdrawn_at = ?,
                login_id = NULL, password_hash = NULL, nickname = NULL, email = NULL, phone = NULL, name = NULL,
                age_range = NULL, bio = NULL, avatar_url = NULL, login_fail_count = 0, locked_until = NULL
          WHERE id = ?`,
        [now, memberId],
      );
      await connection.query(
        "UPDATE post_application SET status = 'CANCELED', canceled_at = ? WHERE applicant_id = ? AND status = 'PENDING'",
        [now, memberId],
      );
      await connection.query('DELETE FROM member_game_profile WHERE member_id = ?', [memberId]);
      await connection.query('DELETE FROM favorite_member WHERE member_id = ? OR target_member_id = ?', [
        memberId,
        memberId,
      ]);
      await connection.query('DELETE FROM post_scrap WHERE member_id = ?', [memberId]);
      await connection.query('DELETE FROM post_draft WHERE member_id = ?', [memberId]);
      await connection.query('DELETE FROM notification_subscription WHERE member_id = ?', [memberId]);
      await connection.query('UPDATE password_reset_token SET used_at = ? WHERE member_id = ? AND used_at IS NULL', [
        now,
        memberId,
      ]);
      await connection.query('UPDATE refresh_token SET revoked_at = ? WHERE member_id = ? AND revoked_at IS NULL', [
        now,
        memberId,
      ]);
      return true;
    });
  }

  return {
    findAccount,
    findGameProfiles,
    findGameIdsByCodes,
    existsNicknameOfOther,
    updateProfile,
    updatePassword,
    countActiveParties,
    findSanctionTypes,
    withdraw,
  };
}

module.exports = { createAccountRepository };
