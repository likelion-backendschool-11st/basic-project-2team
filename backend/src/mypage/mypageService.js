'use strict';

const { ApiError } = require('../common/ApiError');
const { TOP_TAG_LIMIT, RECENT_RATING_LIMIT, mypageMessages } = require('./mypageConstants');
const { parsePageQuery, parseApplicationQuery } = require('./mypageValidator');

const WITHDRAWN = 'WITHDRAWN';
const POST_STATUS_COMPLETED = 'COMPLETED';
const COMPLETABLE_POST_STATUSES = Object.freeze(['OPEN', 'CLOSED']);
const APPLICATION_ACCEPTED = 'ACCEPTED';

/**
 * 「별점 평가」 버튼용 진행 상황. 평가할 수 있는 공고(활동 완료 + 내가 파티 구성원)가 아니면 null.
 * reviewedCount 가 targetCount 와 같으면 모두 평가한 상태입니다.
 */
const toReviewProgress = (row, reviewable) =>
  reviewable ? { targetCount: Number(row.reviewTargetCount), reviewedCount: Number(row.reviewedCount) } : null;

const toIso = (value) => (value ? new Date(value).toISOString() : null);
/** 소수 첫째 자리까지 (DECIMAL 은 문자열로 읽히므로 숫자로 바꿉니다) */
const round1 = (value) => Math.round(Number(value) * 10) / 10;

const memberNotFound = () => new ApiError(404, 'MEMBER_NOT_FOUND', mypageMessages.memberNotFound);

/** 페이지네이션 응답 `{ items, page, size, totalCount, totalPages }` */
const toPage = ({ rows, totalCount }, { page, size }, mapRow) => ({
  items: rows.map(mapRow),
  page,
  size,
  totalCount,
  totalPages: Math.ceil(totalCount / size),
});

/** 목록 아이템의 공고 요약 (POST_COLUMNS 기준 행) */
const toPostSummary = (row) => ({
  id: row.postId,
  category: row.categoryCode,
  game: row.gameCode,
  gameName: row.gameName,
  type: row.partyType,
  title: row.title,
  current: row.currentCount,
  max: row.headcount,
  schedule: toIso(row.scheduleAt),
  scheduleTbd: row.scheduleAt === null || row.scheduleAt === undefined,
  status: row.postStatus,
});

/** 출발 시간이 지났거나(일정 미정 포함) 완료 처리할 수 있는 시점인지 */
const hasStarted = (row, now) => !row.scheduleAt || new Date(row.scheduleAt) <= now;

const toMyPost = (now) => (row) => ({
  ...toPostSummary(row),
  views: row.viewCount,
  commentCount: row.commentCount,
  createdAt: toIso(row.createdAt),
  // 「활동 완료」 버튼: 아직 완료 전이고 승인된 파티원이 있으며 출발 시간이 지났을 때 (PATCH /api/posts/{postId}/status 의 완료 조건과 같음)
  canComplete: COMPLETABLE_POST_STATUSES.includes(row.postStatus) && Number(row.reviewTargetCount) > 0 && hasStarted(row, now),
  review: toReviewProgress(row, row.postStatus === POST_STATUS_COMPLETED),
});

const toMyApplication = (row) => ({
  id: row.id,
  status: row.status,
  role: row.role ?? null,
  appliedAt: toIso(row.appliedAt),
  post: {
    ...toPostSummary(row),
    host: row.hostStatus === WITHDRAWN ? mypageMessages.withdrawnMember : row.hostNickname,
  },
  review: toReviewProgress(row, row.status === APPLICATION_ACCEPTED && row.postStatus === POST_STATUS_COMPLETED),
});

const toMyComment = (row) => ({
  id: row.id,
  postId: row.postId,
  postTitle: row.postTitle,
  game: row.gameCode,
  gameName: row.gameName,
  content: row.content,
  secret: Boolean(row.isSecret),
  reply: row.parentId !== null && row.parentId !== undefined,
  status: row.status,
  createdAt: toIso(row.createdAt),
});

const toFavorite = (row) => ({
  id: row.id,
  nickname: row.nickname,
  avatarUrl: row.avatarUrl ?? null,
  level: row.level,
  mannerTemp: Number(row.mannerTemp),
  mainGame: row.mainGameCode ? { code: row.mainGameCode, name: row.mainGameName } : null,
  playStyle: row.mainPlayStyle ?? null,
  favoritedAt: toIso(row.favoritedAt),
});

/** 받은 태그 [{ code, label, count }] → 순위와 비율(태그를 고른 평가 수 / 전체 평가 수) */
const toTopTags = (tags, ratingCount) =>
  tags.map((tag, index) => ({
    rank: index + 1,
    code: tag.code,
    label: tag.label,
    count: tag.count,
    percent: ratingCount > 0 ? Math.round((tag.count / ratingCount) * 100) : 0,
  }));

/**
 * 마이페이지 조회·즐겨찾기 비즈니스 로직.
 * @param {{ mypageRepository: ReturnType<typeof import('./mypageRepository').createMypageRepository> }} deps
 */
function createMypageService({ mypageRepository, now = () => new Date() }) {
  /** 프로필 공통 응답. includePrivate 이면 비공개 항목(나이대)도 그대로 담습니다. */
  async function buildProfile(member, { includePrivate }) {
    const [games, stats, tags] = await Promise.all([
      mypageRepository.findGameProfiles(member.id),
      mypageRepository.findProfileStats(member.id, RECENT_RATING_LIMIT),
      mypageRepository.findTopReviewTags(member.id, TOP_TAG_LIMIT),
    ]);
    const ageRangeVisible = includePrivate || Boolean(member.ageRangePublic);
    return {
      id: member.id,
      nickname: member.nickname,
      avatarUrl: member.avatarUrl ?? null,
      bio: member.bio ?? null,
      ageRange: ageRangeVisible ? (member.ageRange ?? null) : null,
      level: member.level,
      mannerTemp: Number(member.mannerTemp),
      reviewCount: member.reviewCount,
      averageRating: stats.recentAverageRating === null ? null : round1(stats.recentAverageRating),
      postCount: stats.postCount,
      completedPartyCount: stats.completedPartyCount,
      games: games.map((game) => ({
        code: game.code,
        name: game.name,
        isMain: Boolean(game.isMain),
        playStyle: game.playStyle ?? null,
        playTimeSlot: game.playTimeSlot ?? null,
      })),
      topTags: toTopTags(tags, stats.ratingCount),
      createdAt: toIso(member.createdAt),
    };
  }

  /** GET /api/members/me/summary — 내 프로필 요약. 토큰은 유효하지만 탈퇴한 회원이면 401 */
  async function getMySummary(memberId) {
    const member = await mypageRepository.findMember(memberId);
    if (!member || member.status === WITHDRAWN) {
      throw new ApiError(401, 'UNAUTHORIZED', mypageMessages.unauthorized);
    }
    const profile = await buildProfile(member, { includePrivate: true });
    return { ...profile, ageRangePublic: Boolean(member.ageRangePublic) };
  }

  /**
   * GET /api/members/{memberId} — 다른 회원 프로필. 탈퇴 회원은 404.
   * @param {number} memberId
   * @param {number | null} viewerId 비로그인이면 null
   */
  async function getMemberProfile(memberId, viewerId) {
    const member = await mypageRepository.findMember(memberId);
    if (!member || member.status === WITHDRAWN) throw memberNotFound();

    const isMe = viewerId === memberId;
    const profile = await buildProfile(member, { includePrivate: isMe });

    let viewer = null;
    if (viewerId !== null) {
      viewer = { isMe, favorited: isMe ? false : await mypageRepository.isFavorite(viewerId, memberId) };
    }
    return { ...profile, viewer };
  }

  /** GET /api/members/me/posts — 내가 작성한 공고 */
  async function listMyPosts(memberId, query) {
    const paging = parsePageQuery(query);
    const result = await mypageRepository.findMyPostPage({
      memberId,
      limit: paging.size,
      offset: (paging.page - 1) * paging.size,
    });
    return toPage(result, paging, toMyPost(now()));
  }

  /** GET /api/members/me/applications — 내가 신청한 공고 (신청 상태 포함) */
  async function listMyApplications(memberId, query) {
    const { status, ...paging } = parseApplicationQuery(query);
    const result = await mypageRepository.findMyApplicationPage({
      memberId,
      status,
      limit: paging.size,
      offset: (paging.page - 1) * paging.size,
    });
    return toPage(result, paging, toMyApplication);
  }

  /** GET /api/members/me/comments — 내가 작성한 댓글 */
  async function listMyComments(memberId, query) {
    const paging = parsePageQuery(query);
    const result = await mypageRepository.findMyCommentPage({
      memberId,
      limit: paging.size,
      offset: (paging.page - 1) * paging.size,
    });
    return toPage(result, paging, toMyComment);
  }

  /** GET /api/members/me/favorites — 즐겨찾는 유저 목록 */
  async function listFavorites(memberId) {
    const rows = await mypageRepository.findFavorites(memberId);
    return rows.map(toFavorite);
  }

  /** POST /api/members/me/favorites/{memberId} — 이미 즐겨찾기한 유저여도 성공으로 처리합니다. */
  async function addFavorite(memberId, targetMemberId) {
    if (memberId === targetMemberId) {
      throw new ApiError(400, 'CANNOT_FAVORITE_SELF', mypageMessages.cannotFavoriteSelf);
    }
    const target = await mypageRepository.findMember(targetMemberId);
    if (!target || target.status === WITHDRAWN) throw memberNotFound();
    await mypageRepository.addFavorite(memberId, targetMemberId);
  }

  /** DELETE /api/members/me/favorites/{memberId} — 즐겨찾기하지 않은 유저여도 성공으로 처리합니다. */
  async function removeFavorite(memberId, targetMemberId) {
    await mypageRepository.removeFavorite(memberId, targetMemberId);
  }

  return {
    getMySummary,
    getMemberProfile,
    listMyPosts,
    listMyApplications,
    listMyComments,
    listFavorites,
    addFavorite,
    removeFavorite,
  };
}

module.exports = { createMypageService };
