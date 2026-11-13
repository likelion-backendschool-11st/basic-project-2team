'use strict';

/** @param {{ gameRepository: ReturnType<typeof import('./gameRepository').createGameRepository> }} deps */
function createGameService({ gameRepository }) {
  /** GET /api/games — 게임별 상세 콘텐츠. 콘텐츠 유형(RAID 등)은 공고 type 값(raid)과 맞춰 소문자로 내려줍니다. */
  async function listGames() {
    const games = new Map();
    for (const row of await gameRepository.findAllWithContents()) {
      if (!games.has(row.gameCode)) {
        games.set(row.gameCode, { code: row.gameCode, name: row.gameName, categoryCode: row.categoryCode, contents: [] });
      }
      if (row.contentCode) {
        games.get(row.gameCode).contents.push({
          code: row.contentCode,
          name: row.contentName,
          type: row.contentType.toLowerCase(),
          maxHeadcount: row.maxHeadcount,
        });
      }
    }
    return [...games.values()];
  }

  return { listGames };
}

module.exports = { createGameService };
