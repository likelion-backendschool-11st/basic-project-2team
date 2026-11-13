'use strict';

/**
 * post · post_tag · tag · game · game_content 테이블 접근.
 * @param {import('mysql2/promise').Pool} pool
 */
const { POST_STATUS_DELETED, POST_STATUS_COMPLETED, STATUS_CHANGE_RESULT } = require('./postConstants');
const { awardActivityPoints } = require('../common/activityPoint');

/** 활동 완료 시 점수를 받을 파티원: 승인된 신청자 중 탈퇴하지 않은 회원 */
const ACCEPTED_MEMBERS_SQL = `SELECT pa.applicant_id AS memberId
   FROM post_application pa
   JOIN member m ON m.id = pa.applicant_id
  WHERE pa.post_id = ? AND pa.status = 'ACCEPTED' AND m.status <> 'WITHDRAWN'`;

function createPostRepository(pool) {
  /** 게임 코드 → { id, categoryCode }. 없거나 비활성이면 null */
  async function findGameByCode(code) {
    const [rows] = await pool.query(
      'SELECT id, category_code AS categoryCode FROM game WHERE code = ? AND is_active = TRUE LIMIT 1',
      [code],
    );
    return rows[0] ?? null;
  }

  /** 게임 안의 상세 콘텐츠 코드 → { id, type(소문자), maxHeadcount }. 없으면 null */
  async function findGameContent(gameId, code) {
    const [rows] = await pool.query(
      'SELECT id, LOWER(content_type) AS type, max_headcount AS maxHeadcount FROM game_content WHERE game_id = ? AND code = ? LIMIT 1',
      [gameId, code],
    );
    return rows[0] ?? null;
  }

  /** 공고와 태그 연결을 한 트랜잭션으로 저장하고 새 공고 id 를 반환합니다. */
  async function createPost({ post, tags }) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.query(
        `INSERT INTO post (author_id, category_code, game_id, game_content_id, party_type, title, body,
                           party_name, play_style, headcount, schedule_at, voice_required)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          post.authorId,
          post.categoryCode,
          post.gameId,
          post.gameContentId,
          post.partyType,
          post.title,
          post.body,
          post.partyName,
          post.playStyle,
          post.headcount,
          post.scheduleAt,
          post.voiceRequired,
        ],
      );
      const postId = result.insertId;

      if (tags.length > 0) {
        await connection.query('INSERT IGNORE INTO tag (name) VALUES ?', [tags.map((name) => [name])]);
        const [tagRows] = await connection.query('SELECT id FROM tag WHERE name IN (?)', [tags]);
        await connection.query('INSERT INTO post_tag (post_id, tag_id) VALUES ?', [
          tagRows.map((row) => [postId, row.id]),
        ]);
      }

      // 등록한 글의 임시저장은 더 이어 쓸 일이 없으므로 같은 트랜잭션에서 지웁니다.
      await connection.query('DELETE FROM post_draft WHERE member_id = ?', [post.authorId]);

      await connection.commit();
      return postId;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /** 임시저장(회원당 1개)을 덮어씁니다. 내용이 같아도 저장 시각은 갱신합니다. */
  async function saveDraft(memberId, payload) {
    await pool.query(
      `INSERT INTO post_draft (member_id, payload) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP`,
      [memberId, JSON.stringify(payload)],
    );
    return findDraft(memberId);
  }

  /** 내 임시저장 → { payload, savedAt }. 없으면 null */
  async function findDraft(memberId) {
    const [rows] = await pool.query('SELECT payload, updated_at AS savedAt FROM post_draft WHERE member_id = ? LIMIT 1', [memberId]);
    return rows[0] ?? null;
  }

  /** 삭제되지 않은 공고의 작성자와 상태 → { authorId, status }. 없거나 삭제됐으면 null */
  async function findPostAuthor(postId) {
    const [rows] = await pool.query(
      `SELECT author_id AS authorId, status FROM post WHERE id = ? AND deleted_at IS NULL AND status <> '${POST_STATUS_DELETED}' LIMIT 1`,
      [postId],
    );
    return rows[0] ?? null;
  }

  /**
   * 모집 상태를 바꿉니다. 공고 행을 잠근 뒤 상태를 다시 확인하므로 동시에 요청해도 완료 처리는 한 번만 됩니다.
   * COMPLETED 로 바꾸면 같은 트랜잭션에서 파티장과 승인된 파티원에게 활동 점수(PARTY_COMPLETE)를 지급합니다.
   * @param {number} postId
   * @param {'OPEN' | 'CLOSED' | 'COMPLETED'} status
   * @returns {Promise<string>} STATUS_CHANGE_RESULT 값
   */
  async function changePostStatus(postId, status) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [[post]] = await connection.query(
        `SELECT author_id AS authorId, status FROM post
          WHERE id = ? AND deleted_at IS NULL AND status <> '${POST_STATUS_DELETED}' FOR UPDATE`,
        [postId],
      );
      let result;
      if (!post) result = STATUS_CHANGE_RESULT.notFound;
      else if (post.status === status) result = STATUS_CHANGE_RESULT.unchanged;
      else if (post.status === POST_STATUS_COMPLETED) result = STATUS_CHANGE_RESULT.alreadyCompleted;
      else if (status !== POST_STATUS_COMPLETED) {
        await connection.query('UPDATE post SET status = ? WHERE id = ?', [status, postId]);
        result = STATUS_CHANGE_RESULT.changed;
      } else {
        const [accepted] = await connection.query(ACCEPTED_MEMBERS_SQL, [postId]);
        if (accepted.length === 0) {
          result = STATUS_CHANGE_RESULT.noPartyMembers;
        } else {
          await connection.query('UPDATE post SET status = ? WHERE id = ?', [status, postId]);
          // 리뷰 저장(reviewRepository)과 같은 순서(id 오름차순)로 회원 행을 잠가 교착을 막습니다.
          const memberIds = [post.authorId, ...accepted.map((row) => row.memberId)].sort((a, b) => a - b);
          await connection.query('SELECT id FROM member WHERE id IN (?) ORDER BY id FOR UPDATE', [memberIds]);
          for (const memberId of memberIds) {
            await awardActivityPoints(connection, memberId, [{ actionType: 'PARTY_COMPLETE', refId: postId }]);
          }
          result = STATUS_CHANGE_RESULT.changed;
        }
      }
      await connection.commit();
      return result;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * 공고를 소프트 삭제(status = DELETED, deleted_at)하고 스크랩을 정리합니다. 신청·댓글·리뷰는 그대로 둡니다.
   * @returns {Promise<boolean>} 삭제했으면 true, 그 사이 이미 삭제됐으면 false
   */
  async function softDeletePost(postId, deletedAt) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.query(
        `UPDATE post SET status = '${POST_STATUS_DELETED}', deleted_at = ?
          WHERE id = ? AND deleted_at IS NULL AND status <> '${POST_STATUS_DELETED}'`,
        [deletedAt, postId],
      );
      if (result.affectedRows > 0) await connection.query('DELETE FROM post_scrap WHERE post_id = ?', [postId]);
      await connection.commit();
      return result.affectedRows > 0;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  return {
    findGameByCode,
    findGameContent,
    createPost,
    saveDraft,
    findDraft,
    findPostAuthor,
    softDeletePost,
    changePostStatus,
  };
}

module.exports = { createPostRepository };
