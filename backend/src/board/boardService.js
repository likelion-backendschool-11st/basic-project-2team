'use strict';

const { ApiError } = require('../common/ApiError');
const { boardMessages } = require('./boardConstants');
const { parseListQuery, parseFeaturedQuery } = require('./boardValidator');

const toIso = (value) => (value ? new Date(value).toISOString() : null);

/** DB 행 → 공고 상세 응답 (docs/API_SPEC.md 3절 「공고 상세 응답」) */
function toPostDetail(row, tags, viewer) {
  const withdrawn = row.hostStatus === 'WITHDRAWN';
  return {
    id: row.id,
    category: row.categoryCode,
    categoryName: row.categoryName,
    game: row.gameCode,
    gameName: row.gameName,
    detail: row.detailCode ?? null,
    detailName: row.detailName ?? null,
    detailType: row.detailType ?? null,
    type: row.partyType,
    title: row.title,
    body: row.body,
    partyName: row.partyName ?? null,
    style: row.playStyle ?? null,
    requiredSpec: row.requiredSpec ?? null,
    headcount: row.headcount,
    current: row.currentCount,
    schedule: toIso(row.scheduleAt),
    scheduleTbd: row.scheduleAt === null || row.scheduleAt === undefined,
    voiceRequired: Boolean(row.voiceRequired),
    status: row.status,
    views: row.viewCount,
    commentCount: row.commentCount,
    tags,
    host: {
      id: row.hostId,
      nickname: withdrawn ? boardMessages.withdrawnHost : row.hostNickname,
      avatarUrl: withdrawn ? null : (row.hostAvatarUrl ?? null),
      level: row.hostLevel,
      mannerTemp: Number(row.hostMannerTemp),
      reviewCount: row.hostReviewCount,
    },
    viewer,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

/** DB 행 → 공고 목록 아이템 (docs/API_SPEC.md 3절 「공고 목록 아이템」) */
function toPostListItem(row, tags) {
  return {
    id: row.id,
    category: row.categoryCode,
    game: row.gameCode,
    gameName: row.gameName,
    type: row.partyType,
    title: row.title,
    current: row.currentCount,
    max: row.headcount,
    tags,
    author: row.authorStatus === 'WITHDRAWN' ? boardMessages.withdrawnHost : row.authorNickname,
    schedule: toIso(row.scheduleAt),
    scheduleTbd: row.scheduleAt === null || row.scheduleAt === undefined,
    voiceRequired: Boolean(row.voiceRequired),
    views: row.viewCount,
    commentCount: row.commentCount,
    status: row.status,
    createdAt: toIso(row.createdAt),
  };
}

/**
 * 공고 목록·상세 조회 비즈니스 로직.
 * @param {{ boardRepository: ReturnType<typeof import('./boardRepository').createBoardRepository> }} deps
 */
function createBoardService({ boardRepository, now = () => new Date() }) {
  /**
   * GET /api/posts/{postId} — 조회수를 1 올리고 상세를 돌려줍니다.
   * @param {number} postId
   * @param {number | null} memberId 비로그인이면 null
   */
  async function getPostDetail(postId, memberId) {
    const increased = await boardRepository.increaseViewCount(postId);
    if (!increased) throw new ApiError(404, 'POST_NOT_FOUND', boardMessages.postNotFound);

    const row = await boardRepository.findPostDetail(postId);
    if (!row) throw new ApiError(404, 'POST_NOT_FOUND', boardMessages.postNotFound);

    const tags = await boardRepository.findTagNames(postId);

    let viewer = null;
    if (memberId !== null) {
      const state = await boardRepository.findViewerState(postId, memberId);
      viewer = { isOwner: row.hostId === memberId, ...state };
    }

    return toPostDetail(row, tags, viewer);
  }

  /** GET /api/posts — 공고 목록 (페이지네이션 응답 `{ items, page, size, totalCount, totalPages }`) */
  async function listPosts(query) {
    const { category, q, sort, tags, page, size, excludeClosed } = parseListQuery(query);
    const { rows, totalCount } = await boardRepository.findPostPage({
      category,
      q,
      sort,
      tags,
      excludeClosed,
      limit: size,
      offset: (page - 1) * size,
    });
    const tagsByPost = await boardRepository.findTagNamesByPostIds(rows.map((row) => row.id));
    return {
      items: rows.map((row) => toPostListItem(row, tagsByPost.get(row.id) ?? [])),
      page,
      size,
      totalCount,
      totalPages: Math.ceil(totalCount / size),
    };
  }

  /** GET /api/posts/popular · urgent — 메인 화면용 공고 목록(배열, 목록 아이템과 같은 모양) */
  async function listFeatured(kind, query) {
    const { category, limit } = parseFeaturedQuery(query);
    const rows = await boardRepository.findFeaturedPosts({ kind, category, limit, now: now() });
    const tagsByPost = await boardRepository.findTagNamesByPostIds(rows.map((row) => row.id));
    return rows.map((row) => toPostListItem(row, tagsByPost.get(row.id) ?? []));
  }

  return { getPostDetail, listPosts, listFeatured };
}

module.exports = { createBoardService };
