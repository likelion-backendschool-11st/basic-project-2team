'use strict';

const { parseRankingQuery } = require('./rankingValidator');

/**
 * 랭킹 조회 비즈니스 로직.
 * @param {{ rankingRepository: ReturnType<typeof import('./rankingRepository').createRankingRepository> }} deps
 */
function createRankingService({ rankingRepository }) {
  /** GET /api/rankings/manner — 매너 온도 순위 (메인 명예의 전당) */
  async function getMannerRanking(query) {
    const { limit } = parseRankingQuery(query);
    const rows = await rankingRepository.findMannerRanking(limit);
    const topTags = await rankingRepository.findTopTagByMember(rows.map((row) => row.id));
    return rows.map((row, index) => ({
      rank: index + 1,
      id: row.id,
      nickname: row.nickname,
      avatarUrl: row.avatarUrl ?? null,
      level: row.level,
      mannerTemp: Number(row.mannerTemp),
      reviewCount: row.reviewCount,
      mainGame: row.mainGameCode ? { code: row.mainGameCode, name: row.mainGameName } : null,
      topTag: topTags.get(row.id) ?? null,
    }));
  }

  return { getMannerRanking };
}

module.exports = { createRankingService };
