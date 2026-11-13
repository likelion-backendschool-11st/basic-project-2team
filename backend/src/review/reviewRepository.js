'use strict';

const { POST_STATUS_DELETED, APPLICATION_STATUS_ACCEPTED, MEMBER_STATUS_WITHDRAWN } = require('./reviewConstants');
const { INITIAL_MANNER_TEMP, applyRatings } = require('./mannerTemp');
const { awardActivityPoints } = require('../common/activityPoint');

/**
 * 회원 행을 id 순서로 잠그고 { id → { mannerTemp, reviewCount } } 를 돌려줍니다.
 * 항상 같은 순서로 잠가야 동시에 들어온 평가끼리 교착(deadlock)이 생기지 않습니다.
 */
async function lockMembers(connection, memberIds) {
  const [rows] = await connection.query(
    'SELECT id, manner_temp AS mannerTemp, review_count AS reviewCount FROM member WHERE id IN (?) ORDER BY id FOR UPDATE',
    [[...new Set(memberIds)].sort((a, b) => a - b)],
  );
  return new Map(rows.map((row) => [row.id, row]));
}

/**
 * 리뷰 저장과 같은 트랜잭션에서 실행하는 후처리:
 * 대상 회원의 매너 온도 · 받은 평가 수를 갱신하고, 평가자에게 리뷰 1건마다 활동 점수(REVIEW_WRITE)를 지급합니다.
 * @param {import('mysql2/promise').PoolConnection} connection
 * @param {Map<number, { mannerTemp: string | number, reviewCount: number }>} lockedMembers lockMembers 결과
 * @param {{ reviewerId: number, reviews: Array<{ id: number, targetMemberId: number, rating: number }> }} saved
 */
async function applyReviewEffects(connection, lockedMembers, { reviewerId, reviews }) {
  for (const review of reviews) {
    const target = lockedMembers.get(review.targetMemberId);
    await connection.query('UPDATE member SET manner_temp = ?, review_count = review_count + 1 WHERE id = ?', [
      applyRatings(target.mannerTemp, [review.rating]),
      review.targetMemberId,
    ]);
  }
  await awardActivityPoints(
    connection,
    reviewerId,
    reviews.map((review) => ({ actionType: 'REVIEW_WRITE', refId: review.id })),
  );
}

/**
 * review · review_tag · review_tag_map · post · post_application · member · member_game_profile 테이블 접근.
 * @param {import('mysql2/promise').Pool} pool
 */
function createReviewRepository(pool) {
  /** 활성 평가 태그 [{ id, code, label }] (sort_order 순) */
  async function findActiveReviewTags() {
    const [rows] = await pool.query('SELECT id, code, label FROM review_tag WHERE is_active = TRUE ORDER BY sort_order, id');
    return rows;
  }

  /** 삭제되지 않은 공고 → { id, authorId, status, gameName }. 없으면 null */
  async function findPost(postId) {
    const [rows] = await pool.query(
      `SELECT p.id, p.author_id AS authorId, p.status, g.name AS gameName
         FROM post p
         JOIN game g ON g.id = p.game_id
        WHERE p.id = ? AND p.deleted_at IS NULL AND p.status <> '${POST_STATUS_DELETED}'
        LIMIT 1`,
      [postId],
    );
    return rows[0] ?? null;
  }

  /**
   * 파티 구성원: 파티장(공고 작성자) + 승인된 신청자. 탈퇴 회원은 뺍니다. 파티장이 먼저, 그다음 승인 순입니다.
   * @returns {Promise<Array<{ id: number, nickname: string, avatarUrl: string | null, level: number, isHost: number, role: string | null, characterName: string | null }>>}
   */
  async function findPartyMembers(postId) {
    const [rows] = await pool.query(
      `SELECT m.id, m.nickname, m.avatar_url AS avatarUrl, m.level, party.isHost, party.role,
              mgp.character_name AS characterName
         FROM (
                SELECT p.author_id AS memberId, 1 AS isHost, NULL AS role, p.created_at AS joinedAt, 0 AS applicationId
                  FROM post p
                 WHERE p.id = ?
                UNION ALL
                SELECT pa.applicant_id, 0, pa.role, COALESCE(pa.decided_at, pa.created_at), pa.id
                  FROM post_application pa
                 WHERE pa.post_id = ? AND pa.status = '${APPLICATION_STATUS_ACCEPTED}'
              ) party
         JOIN member m ON m.id = party.memberId
         JOIN post p ON p.id = ?
         LEFT JOIN member_game_profile mgp ON mgp.member_id = m.id AND mgp.game_id = p.game_id
        WHERE m.status <> '${MEMBER_STATUS_WITHDRAWN}'
        ORDER BY party.isHost DESC, party.joinedAt, party.applicationId`,
      [postId, postId, postId],
    );
    return rows;
  }

  /** 이 공고에서 reviewerId 가 이미 평가한 대상 id 목록 */
  async function findReviewedTargetIds(postId, reviewerId) {
    const [rows] = await pool.query('SELECT target_id AS targetId FROM review WHERE post_id = ? AND reviewer_id = ?', [
      postId,
      reviewerId,
    ]);
    return rows.map((row) => row.targetId);
  }

  /**
   * 평가 · 태그 연결 · 매너 온도 · 활동 점수를 한 트랜잭션으로 저장하고 새 review id 목록을 돌려줍니다.
   * 같은 (post, reviewer, target) 이 이미 있으면 UQ 위반(ER_DUP_ENTRY)으로 전체가 롤백됩니다.
   * 대상 회원은 한 요청 안에서 중복되지 않는다고 가정합니다 (validator 가 보장).
   * @param {{ postId: number, reviewerId: number, reviews: Array<{ targetMemberId: number, rating: number, comment: string | null, tagIds: number[] }> }} input
   * @returns {Promise<number[]>}
   */
  async function createReviews({ postId, reviewerId, reviews }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const lockedMembers = await lockMembers(connection, [reviewerId, ...reviews.map((review) => review.targetMemberId)]);
      const saved = [];
      for (const review of reviews) {
        const [result] = await connection.query(
          'INSERT INTO review (post_id, reviewer_id, target_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
          [postId, reviewerId, review.targetMemberId, review.rating, review.comment],
        );
        if (review.tagIds.length > 0) {
          await connection.query('INSERT INTO review_tag_map (review_id, review_tag_id) VALUES ?', [
            review.tagIds.map((tagId) => [result.insertId, tagId]),
          ]);
        }
        saved.push({ id: result.insertId, targetMemberId: review.targetMemberId, rating: review.rating });
      }
      await applyReviewEffects(connection, lockedMembers, { reviewerId, reviews: saved });
      await connection.commit();
      return saved.map((review) => review.id);
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * 데이터 보정용: 리뷰 행만으로 매너 온도 · 받은 평가 수를 처음부터 다시 계산합니다 (review.id 순으로 반영).
   * @param {number[] | null} [memberIds] 생략하면 전체 회원
   * @returns {Promise<number>} 값이 바뀐 회원 수
   */
  async function recalculateMannerTemps(memberIds = null) {
    if (memberIds !== null && memberIds.length === 0) return 0;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const members =
        memberIds === null
          ? (
              await connection.query(
                'SELECT id, manner_temp AS mannerTemp, review_count AS reviewCount FROM member ORDER BY id FOR UPDATE',
              )
            )[0]
          : [...(await lockMembers(connection, memberIds)).values()];

      const [reviewRows] = await connection.query(
        `SELECT target_id AS targetId, rating FROM review ${memberIds === null ? '' : 'WHERE target_id IN (?)'} ORDER BY id`,
        memberIds === null ? [] : [memberIds],
      );
      const ratingsByMember = new Map();
      for (const row of reviewRows) {
        if (!ratingsByMember.has(row.targetId)) ratingsByMember.set(row.targetId, []);
        ratingsByMember.get(row.targetId).push(row.rating);
      }

      let changed = 0;
      for (const member of members) {
        const ratings = ratingsByMember.get(member.id) ?? [];
        const mannerTemp = applyRatings(INITIAL_MANNER_TEMP, ratings);
        if (Number(member.mannerTemp) === mannerTemp && member.reviewCount === ratings.length) continue;
        await connection.query('UPDATE member SET manner_temp = ?, review_count = ? WHERE id = ?', [
          mannerTemp,
          ratings.length,
          member.id,
        ]);
        changed += 1;
      }
      await connection.commit();
      return changed;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  return {
    findActiveReviewTags,
    findPost,
    findPartyMembers,
    findReviewedTargetIds,
    createReviews,
    recalculateMannerTemps,
  };
}

module.exports = { createReviewRepository };
