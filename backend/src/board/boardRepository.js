'use strict';

const { POST_STATUS } = require('./boardConstants');

/** 삭제되지 않은 공고만 대상으로 하는 조건 (소프트 삭제: deleted_at / status = DELETED) */
const ALIVE_POST = `p.deleted_at IS NULL AND p.status <> '${POST_STATUS.deleted}'`;

/**
 * 공고 상세 조회용 테이블 접근: post · category · game · game_content · member · post_tag · tag · post_scrap · post_application
 * @param {import('mysql2/promise').Pool} pool
 */
function createBoardRepository(pool) {
  /** 조회수 +1. 삭제됐거나 없는 공고면 false */
  async function increaseViewCount(postId) {
    const [result] = await pool.query(`UPDATE post p SET p.view_count = p.view_count + 1 WHERE p.id = ? AND ${ALIVE_POST}`, [
      postId,
    ]);
    return result.affectedRows > 0;
  }

  /** 공고 본문 + 게임/카테고리/상세 분류 + 작성자(파티장) 프로필. 없으면 null */
  async function findPostDetail(postId) {
    const [rows] = await pool.query(
      `SELECT p.id, p.category_code AS categoryCode, c.name AS categoryName,
              g.code AS gameCode, g.name AS gameName,
              gc.code AS detailCode, gc.name AS detailName, gc.content_type AS detailType,
              p.party_type AS partyType, p.title, p.body, p.party_name AS partyName, p.play_style AS playStyle,
              p.required_spec AS requiredSpec, p.headcount, p.current_count AS currentCount,
              p.schedule_at AS scheduleAt, p.voice_required AS voiceRequired, p.status,
              p.view_count AS viewCount, p.comment_count AS commentCount,
              p.created_at AS createdAt, p.updated_at AS updatedAt,
              m.id AS hostId, m.nickname AS hostNickname, m.avatar_url AS hostAvatarUrl, m.level AS hostLevel,
              m.manner_temp AS hostMannerTemp, m.review_count AS hostReviewCount, m.status AS hostStatus
         FROM post p
         JOIN category c ON c.code = p.category_code
         JOIN game g ON g.id = p.game_id
         LEFT JOIN game_content gc ON gc.id = p.game_content_id
         JOIN member m ON m.id = p.author_id
        WHERE p.id = ? AND ${ALIVE_POST}
        LIMIT 1`,
      [postId],
    );
    return rows[0] ?? null;
  }

  /** 공고에 붙은 태그 이름 (등록 순) */
  async function findTagNames(postId) {
    const [rows] = await pool.query(
      `SELECT t.name FROM post_tag pt JOIN tag t ON t.id = pt.tag_id
        WHERE pt.post_id = ? ORDER BY pt.created_at, t.id`,
      [postId],
    );
    return rows.map((row) => row.name);
  }

  /** 로그인한 사용자 기준: 스크랩 여부와 내 신청 상태 (신청한 적 없으면 null) */
  async function findViewerState(postId, memberId) {
    const [rows] = await pool.query(
      `SELECT EXISTS (SELECT 1 FROM post_scrap WHERE post_id = ? AND member_id = ?) AS scrapped,
              (SELECT status FROM post_application WHERE post_id = ? AND applicant_id = ? LIMIT 1) AS applicationStatus`,
      [postId, memberId, postId, memberId],
    );
    const row = rows[0];
    return { scrapped: Boolean(row?.scrapped), applicationStatus: row?.applicationStatus ?? null };
  }

  return { increaseViewCount, findPostDetail, findTagNames, findViewerState };
}

module.exports = { createBoardRepository };
