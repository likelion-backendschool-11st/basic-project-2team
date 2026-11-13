'use strict';

const { POST_STATUS, URGENT_REMAINING_SEATS, URGENT_WITHIN_HOURS } = require('./boardConstants');

/** 삭제되지 않은 공고만 대상으로 하는 조건 (소프트 삭제: deleted_at / status = DELETED) */
const ALIVE_POST = `p.deleted_at IS NULL AND p.status <> '${POST_STATUS.deleted}'`;

/** 정렬은 SQL 에 직접 들어가므로 이 목록의 값만 씁니다. urgent: 출발이 가까운 순(일정 미정은 뒤), 남은 자리가 적은 순 */
const LIST_ORDER = Object.freeze({
  recent: 'p.created_at DESC, p.id DESC',
  views: 'p.view_count DESC, p.id DESC',
  urgent: '(p.schedule_at IS NULL), p.schedule_at ASC, (p.headcount - p.current_count) ASC, p.id DESC',
});

/** 목록·인기·마감 임박이 같은 모양의 행을 돌려주도록 공유하는 SELECT 열과 JOIN */
const LIST_COLUMNS = `p.id, p.category_code AS categoryCode, g.code AS gameCode, g.name AS gameName,
              p.party_type AS partyType, p.title, p.headcount, p.current_count AS currentCount,
              p.schedule_at AS scheduleAt, p.voice_required AS voiceRequired, p.status,
              p.view_count AS viewCount, p.comment_count AS commentCount, p.created_at AS createdAt,
              m.nickname AS authorNickname, m.status AS authorStatus`;
const LIST_JOINS = `FROM post p
         JOIN game g ON g.id = p.game_id
         JOIN member m ON m.id = p.author_id`;

/**
 * 공고 목록·상세 조회용 테이블 접근: post · category · game · game_content · member · post_tag · tag · post_scrap · post_application
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
              (SELECT COUNT(*) FROM post_scrap s WHERE s.post_id = p.id) AS scrapCount,
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

  /**
   * 공고 목록 한 페이지와 전체 건수. 삭제된 공고는 제외하고, tags 는 모두 가진 공고만(AND) 남깁니다.
   * @param {{ category: string | null, q: string, sort: string, tags: string[], excludeClosed: boolean, limit: number, offset: number }} filter
   */
  async function findPostPage({ category, q, sort, tags, excludeClosed, limit, offset }) {
    const where = [ALIVE_POST];
    const params = [];
    if (category) {
      where.push('p.category_code = ?');
      params.push(category);
    }
    if (q) {
      // ponytail: LIKE 전체 탐색. 공고가 많아지면 FULLTEXT(ftx_post_title_party_name)로 교체
      where.push(
        `(p.title LIKE ? OR p.party_name LIKE ? OR g.name LIKE ?
          OR EXISTS (SELECT 1 FROM post_tag st JOIN tag stt ON stt.id = st.tag_id WHERE st.post_id = p.id AND stt.name LIKE ?))`,
      );
      const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
      params.push(pattern, pattern, pattern, pattern);
    }
    if (excludeClosed) where.push(`p.status = '${POST_STATUS.open}'`);
    if (tags.length > 0) {
      where.push(
        `p.id IN (SELECT pt.post_id FROM post_tag pt JOIN tag t ON t.id = pt.tag_id
                   WHERE t.name IN (?) GROUP BY pt.post_id HAVING COUNT(DISTINCT t.id) = ?)`,
      );
      params.push(tags, tags.length);
    }
    const condition = where.join(' AND ');

    const [[{ totalCount }]] = await pool.query(`SELECT COUNT(*) AS totalCount FROM post p JOIN game g ON g.id = p.game_id WHERE ${condition}`, params);
    const [rows] = await pool.query(
      `SELECT ${LIST_COLUMNS}
         ${LIST_JOINS}
        WHERE ${condition}
        ORDER BY ${LIST_ORDER[sort]}
        LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { rows, totalCount };
  }

  /**
   * 메인 화면용 인기·마감 임박 공고. 모집 중이고 아직 출발하지 않은(일정 미정 포함) 공고만 대상입니다.
   * - popular: 조회수 → 댓글 수 순
   * - urgent: 남은 자리가 적거나 출발이 곧인 공고를, 출발이 가까운 순(미정은 뒤) → 남은 자리가 적은 순
   * @param {{ kind: 'popular' | 'urgent', category: string | null, limit: number, now: Date }} filter
   */
  async function findFeaturedPosts({ kind, category, limit, now }) {
    const where = [ALIVE_POST, `p.status = '${POST_STATUS.open}'`, '(p.schedule_at IS NULL OR p.schedule_at > ?)'];
    const params = [now];
    if (category) {
      where.push('p.category_code = ?');
      params.push(category);
    }
    let order = 'p.view_count DESC, p.comment_count DESC, p.id DESC';
    if (kind === 'urgent') {
      where.push(`((p.headcount - p.current_count) <= ${URGENT_REMAINING_SEATS} OR p.schedule_at <= ?)`);
      params.push(new Date(now.getTime() + URGENT_WITHIN_HOURS * 3_600_000));
      order = LIST_ORDER.urgent;
    }
    const [rows] = await pool.query(
      `SELECT ${LIST_COLUMNS}
         ${LIST_JOINS}
        WHERE ${where.join(' AND ')}
        ORDER BY ${order}
        LIMIT ?`,
      [...params, limit],
    );
    return rows;
  }

  /**
   * 한 공고의 관련 공고: 같은 게임의, 모집 중이고 아직 출발하지 않은(일정 미정 포함) 다른 공고.
   * 같은 상세 분류 → 겹치는 태그가 많은 순 → 최신순으로 정렬합니다.
   * @returns {Promise<object[] | null>} 기준 공고가 없거나 삭제됐으면 null
   */
  async function findRelatedPosts({ postId, limit, now }) {
    const [[source]] = await pool.query(
      `SELECT p.game_id AS gameId, p.game_content_id AS gameContentId FROM post p WHERE p.id = ? AND ${ALIVE_POST}`,
      [postId],
    );
    if (!source) return null;
    const [rows] = await pool.query(
      `SELECT ${LIST_COLUMNS}
         ${LIST_JOINS}
        WHERE ${ALIVE_POST} AND p.id <> ? AND p.game_id = ? AND p.status = '${POST_STATUS.open}'
          AND (p.schedule_at IS NULL OR p.schedule_at > ?)
        ORDER BY (p.game_content_id <=> ?) DESC,
                 (SELECT COUNT(*) FROM post_tag pt WHERE pt.post_id = p.id
                     AND pt.tag_id IN (SELECT tag_id FROM post_tag WHERE post_id = ?)) DESC,
                 p.created_at DESC, p.id DESC
        LIMIT ?`,
      [postId, source.gameId, now, source.gameContentId, postId, limit],
    );
    return rows;
  }

  /** 여러 공고의 태그를 한 번에: { postId → 태그 이름[] } */
  async function findTagNamesByPostIds(postIds) {
    const byPost = new Map();
    if (postIds.length === 0) return byPost;
    const [rows] = await pool.query(
      `SELECT pt.post_id AS postId, t.name FROM post_tag pt JOIN tag t ON t.id = pt.tag_id
        WHERE pt.post_id IN (?) ORDER BY pt.created_at, t.id`,
      [postIds],
    );
    for (const row of rows) {
      if (!byPost.has(row.postId)) byPost.set(row.postId, []);
      byPost.get(row.postId).push(row.name);
    }
    return byPost;
  }

  return { increaseViewCount, findPostDetail, findTagNames, findViewerState, findPostPage, findFeaturedPosts, findRelatedPosts, findTagNamesByPostIds };
}

module.exports = { createBoardRepository };
