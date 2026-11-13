'use strict';

const { ApiError } = require('../common/ApiError');
const { DEFAULT_RANKING_LIMIT, MAX_RANKING_LIMIT, rankingMessages: m } = require('./rankingConstants');

/**
 * 매너 랭킹 쿼리 (limit)
 * @returns {{ limit: number }}
 */
function parseRankingQuery(query) {
  const raw = query.limit;
  if (raw === undefined || raw === '') return { limit: DEFAULT_RANKING_LIMIT };
  const limit = typeof raw === 'string' && /^\d{1,3}$/.test(raw) ? Number(raw) : null;
  if (limit === null || limit < 1 || limit > MAX_RANKING_LIMIT) {
    throw new ApiError(400, 'INVALID_INPUT', m.invalidInput, [{ field: 'limit', message: m.limitInvalid }]);
  }
  return { limit };
}

module.exports = { parseRankingQuery };
