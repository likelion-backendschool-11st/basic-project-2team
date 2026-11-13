'use strict';

/** 삭제되지 않은 공고만 대상으로 하는 조건 (소프트 삭제: deleted_at / status = DELETED) */
const ALIVE_POST = "p.deleted_at IS NULL AND p.status <> 'DELETED'";
/** 삭제되지 않은 댓글 (HIDDEN 은 본인에게는 보여줍니다) */
const ALIVE_COMMENT = "c.deleted_at IS NULL AND c.status <> 'DELETED'";

/** 목록 아이템에 공통으로 쓰는 공고 컬럼 (post p, game g) */
const POST_COLUMNS = `p.id AS postId, p.category_code AS categoryCode, g.code AS gameCode, g.name AS gameName,
       p.party_type AS partyType, p.title, p.headcount, p.current_count AS currentCount,
       p.schedule_at AS scheduleAt, p.status AS postStatus`;

/**
 * 마이페이지·회원 프로필 조회용 테이블 접근:
 * member · member_game_profile · game · post · post_application · comment · review · review_tag_map · review_tag · favorite_member
 * @param {import('mysql2/promise').Pool} pool
 */
function createMypageRepository(pool) {
  /** 회원 기본 정보. 없으면 null (탈퇴 여부는 status 로 판단) */
  async function findMember(memberId) {
    const [rows] = await pool.query(
      `SELECT m.id, m.nickname, m.avatar_url AS avatarUrl, m.bio, m.age_range AS ageRange,
              m.age_range_public AS ageRangePublic, m.level, m.manner_temp AS mannerTemp,
              m.review_count AS reviewCount, m.status, m.created_at AS createdAt
         FROM member m
        WHERE m.id = ?
        LIMIT 1`,
      [memberId],
    );
    return rows[0] ?? null;
  }

  /** 게이머 프로필 (대표 게임이 먼저) */
  async function findGameProfiles(memberId) {
    const [rows] = await pool.query(
      `SELECT g.code, g.name, mgp.is_main AS isMain, mgp.play_style AS playStyle, mgp.play_time_slot AS playTimeSlot
         FROM member_game_profile mgp
         JOIN game g ON g.id = mgp.game_id
        WHERE mgp.member_id = ?
        ORDER BY mgp.is_main DESC, g.sort_order, g.id`,
      [memberId],
    );
    return rows;
  }

  /**
   * 프로필 통계: 작성한 공고 수, 완료한 파티 수(파티장 또는 승인된 파티원), 받은 평가 수, 최근 N건 평균 별점
   * @returns {Promise<{ postCount: number, completedPartyCount: number, ratingCount: number, recentAverageRating: number | null }>}
   */
  async function findProfileStats(memberId, recentRatingLimit) {
    const [rows] = await pool.query(
      `SELECT (SELECT COUNT(*) FROM post p WHERE p.author_id = ? AND ${ALIVE_POST}) AS postCount,
              (SELECT COUNT(*) FROM post p
                WHERE p.status = 'COMPLETED' AND p.deleted_at IS NULL
                  AND (p.author_id = ?
                       OR EXISTS (SELECT 1 FROM post_application pa
                                   WHERE pa.post_id = p.id AND pa.applicant_id = ? AND pa.status = 'ACCEPTED'))
              ) AS completedPartyCount,
              (SELECT COUNT(*) FROM review r WHERE r.target_id = ?) AS ratingCount,
              (SELECT AVG(recent.rating) FROM (
                 SELECT r.rating FROM review r WHERE r.target_id = ? ORDER BY r.created_at DESC, r.id DESC LIMIT ?
               ) recent) AS recentAverageRating`,
      [memberId, memberId, memberId, memberId, memberId, recentRatingLimit],
    );
    const row = rows[0];
    return {
      postCount: Number(row.postCount),
      completedPartyCount: Number(row.completedPartyCount),
      ratingCount: Number(row.ratingCount),
      recentAverageRating: row.recentAverageRating === null ? null : Number(row.recentAverageRating),
    };
  }

  /** 받은 평가에서 많이 선택된 태그 상위 N개: [{ code, label, count }] */
  async function findTopReviewTags(memberId, limit) {
    const [rows] = await pool.query(
      `SELECT rt.code, rt.label, COUNT(*) AS count
         FROM review r
         JOIN review_tag_map rtm ON rtm.review_id = r.id
         JOIN review_tag rt ON rt.id = rtm.review_tag_id
        WHERE r.target_id = ?
        GROUP BY rt.id, rt.code, rt.label, rt.sort_order
        ORDER BY count DESC, rt.sort_order, rt.id
        LIMIT ?`,
      [memberId, limit],
    );
    return rows.map((row) => ({ code: row.code, label: row.label, count: Number(row.count) }));
  }

  /** 내가 작성한 공고 한 페이지와 전체 건수 (최신순) */
  async function findMyPostPage({ memberId, limit, offset }) {
    const condition = `p.author_id = ? AND ${ALIVE_POST}`;
    const [[{ totalCount }]] = await pool.query(`SELECT COUNT(*) AS totalCount FROM post p WHERE ${condition}`, [memberId]);
    const [rows] = await pool.query(
      `SELECT ${POST_COLUMNS}, p.view_count AS viewCount, p.comment_count AS commentCount, p.created_at AS createdAt
         FROM post p
         JOIN game g ON g.id = p.game_id
        WHERE ${condition}
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT ? OFFSET ?`,
      [memberId, limit, offset],
    );
    return { rows, totalCount: Number(totalCount) };
  }

  /** 내가 신청한 공고 한 페이지와 전체 건수 (최근 신청순). status 가 있으면 그 상태만 */
  async function findMyApplicationPage({ memberId, status, limit, offset }) {
    const where = ['pa.applicant_id = ?', ALIVE_POST];
    const params = [memberId];
    if (status) {
      where.push('pa.status = ?');
      params.push(status);
    }
    const condition = where.join(' AND ');

    const [[{ totalCount }]] = await pool.query(
      `SELECT COUNT(*) AS totalCount FROM post_application pa JOIN post p ON p.id = pa.post_id WHERE ${condition}`,
      params,
    );
    const [rows] = await pool.query(
      `SELECT pa.id, pa.status, pa.role, pa.created_at AS appliedAt, ${POST_COLUMNS},
              m.nickname AS hostNickname, m.status AS hostStatus
         FROM post_application pa
         JOIN post p ON p.id = pa.post_id
         JOIN game g ON g.id = p.game_id
         JOIN member m ON m.id = p.author_id
        WHERE ${condition}
        ORDER BY pa.created_at DESC, pa.id DESC
        LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { rows, totalCount: Number(totalCount) };
  }

  /** 내가 작성한 댓글 한 페이지와 전체 건수 (최신순). 삭제된 공고의 댓글은 제외 */
  async function findMyCommentPage({ memberId, limit, offset }) {
    const condition = `c.author_id = ? AND ${ALIVE_COMMENT} AND ${ALIVE_POST}`;
    const [[{ totalCount }]] = await pool.query(
      `SELECT COUNT(*) AS totalCount FROM comment c JOIN post p ON p.id = c.post_id WHERE ${condition}`,
      [memberId],
    );
    const [rows] = await pool.query(
      `SELECT c.id, c.content, c.is_secret AS isSecret, c.status, c.parent_id AS parentId, c.created_at AS createdAt,
              p.id AS postId, p.title AS postTitle, g.code AS gameCode, g.name AS gameName
         FROM comment c
         JOIN post p ON p.id = c.post_id
         JOIN game g ON g.id = p.game_id
        WHERE ${condition}
        ORDER BY c.created_at DESC, c.id DESC
        LIMIT ? OFFSET ?`,
      [memberId, limit, offset],
    );
    return { rows, totalCount: Number(totalCount) };
  }

  /** 즐겨찾는 유저 (최근 추가순, 탈퇴 회원 제외) + 대표 게임 */
  async function findFavorites(memberId) {
    const [rows] = await pool.query(
      `SELECT m.id, m.nickname, m.avatar_url AS avatarUrl, m.level, m.manner_temp AS mannerTemp,
              mg.code AS mainGameCode, mg.name AS mainGameName, mgp.play_style AS mainPlayStyle,
              fm.created_at AS favoritedAt
         FROM favorite_member fm
         JOIN member m ON m.id = fm.target_member_id
         LEFT JOIN member_game_profile mgp
                ON mgp.id = (SELECT x.id FROM member_game_profile x
                              WHERE x.member_id = m.id AND x.is_main = TRUE ORDER BY x.id LIMIT 1)
         LEFT JOIN game mg ON mg.id = mgp.game_id
        WHERE fm.member_id = ? AND m.status <> 'WITHDRAWN'
        ORDER BY fm.created_at DESC, m.id DESC`,
      [memberId],
    );
    return rows;
  }

  async function isFavorite(memberId, targetMemberId) {
    const [rows] = await pool.query(
      'SELECT EXISTS (SELECT 1 FROM favorite_member WHERE member_id = ? AND target_member_id = ?) AS favorited',
      [memberId, targetMemberId],
    );
    return Boolean(rows[0]?.favorited);
  }

  /** 즐겨찾기 추가. 이미 있으면 그대로 둡니다. */
  async function addFavorite(memberId, targetMemberId) {
    await pool.query('INSERT IGNORE INTO favorite_member (member_id, target_member_id) VALUES (?, ?)', [
      memberId,
      targetMemberId,
    ]);
  }

  /** 즐겨찾기 해제. 없으면 아무것도 하지 않습니다. */
  async function removeFavorite(memberId, targetMemberId) {
    await pool.query('DELETE FROM favorite_member WHERE member_id = ? AND target_member_id = ?', [
      memberId,
      targetMemberId,
    ]);
  }

  return {
    findMember,
    findGameProfiles,
    findProfileStats,
    findTopReviewTags,
    findMyPostPage,
    findMyApplicationPage,
    findMyCommentPage,
    findFavorites,
    isFavorite,
    addFavorite,
    removeFavorite,
  };
}

module.exports = { createMypageRepository };
