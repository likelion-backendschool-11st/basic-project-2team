'use strict';

const { ApiError } = require('../common/ApiError');
const {
  POST_ID_PATTERN,
  POST_SORTS,
  DEFAULT_SORT,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_FILTER_TAGS,
  MAX_SEARCH_LENGTH,
  CATEGORY_PATTERN,
  DEFAULT_FEATURED_LIMIT,
  MAX_FEATURED_LIMIT,
  boardMessages: m,
} = require('./boardConstants');

/**
 * 경로 파라미터 postId 를 숫자로 바꿉니다. 형식이 틀리면 null.
 * BIGINT 범위를 넘을 수 있어 Number.isSafeInteger 로 한 번 더 확인합니다.
 * @param {unknown} raw
 * @returns {number | null}
 */
function parsePostId(raw) {
  if (typeof raw !== 'string' || !POST_ID_PATTERN.test(raw)) return null;
  const postId = Number(raw);
  return Number.isSafeInteger(postId) ? postId : null;
}

const asString = (value) => (typeof value === 'string' ? value.trim() : '');

/** 양의 정수 문자열이면 숫자로, 아니면 null (값이 없으면 fallback) */
function parseInteger(raw, fallback) {
  if (raw === undefined || raw === '') return fallback;
  return typeof raw === 'string' && /^\d{1,9}$/.test(raw) ? Number(raw) : null;
}

/** tags=a,b 와 tags=a&tags=b 를 모두 받아 중복 없는 목록으로. 형식이 틀리면 null */
function parseTags(raw) {
  if (raw === undefined) return [];
  const items = (Array.isArray(raw) ? raw : [raw]).flatMap((item) => (typeof item === 'string' ? item.split(',') : [null]));
  const tags = [];
  for (const item of items) {
    if (item === null) return null;
    const tag = item.trim().replace(/^#/, '');
    if (!tag) continue;
    if (!tags.includes(tag)) tags.push(tag);
  }
  return tags.length <= MAX_FILTER_TAGS ? tags : null;
}

/** 인기·마감 임박 쿼리(category, limit)를 검증·정규화합니다. */
function parseFeaturedQuery(query) {
  const fields = [];
  const category = query.category === undefined ? null : asString(query.category);
  if (category !== null && !CATEGORY_PATTERN.test(category)) fields.push({ field: 'category', message: m.categoryInvalid });
  const limit = parseInteger(query.limit, DEFAULT_FEATURED_LIMIT);
  if (limit === null || limit < 1 || limit > MAX_FEATURED_LIMIT) fields.push({ field: 'limit', message: m.limitInvalid });
  if (fields.length > 0) throw new ApiError(400, 'INVALID_INPUT', m.invalidInput, fields);
  return { category, limit };
}

/** 관련 공고 쿼리(limit)를 검증·정규화합니다. limit 규칙은 인기·마감 임박과 같습니다. */
function parseRelatedQuery(query) {
  const limit = parseInteger(query.limit, DEFAULT_FEATURED_LIMIT);
  if (limit === null || limit < 1 || limit > MAX_FEATURED_LIMIT) {
    throw new ApiError(400, 'INVALID_INPUT', m.invalidInput, [{ field: 'limit', message: m.limitInvalid }]);
  }
  return { limit };
}

/**
 * 공고 목록 쿼리(category, q, sort, tags, page, size, excludeClosed)를 검증·정규화합니다.
 * @returns {{ category: string | null, q: string, sort: string, tags: string[], page: number, size: number, excludeClosed: boolean }}
 */
function parseListQuery(query) {
  const fields = [];
  const fail = (field, message) => fields.push({ field, message });

  const category = query.category === undefined ? null : asString(query.category);
  if (category !== null && !CATEGORY_PATTERN.test(category)) fail('category', m.categoryInvalid);

  const q = query.q === undefined ? '' : asString(query.q);
  if (Array.from(q).length > MAX_SEARCH_LENGTH) fail('q', m.searchInvalid);

  const sort = query.sort === undefined ? DEFAULT_SORT : asString(query.sort);
  if (!POST_SORTS.includes(sort)) fail('sort', m.sortInvalid);

  const tags = parseTags(query.tags);
  if (tags === null) fail('tags', m.tagsInvalid);

  const page = parseInteger(query.page, 1);
  if (page === null || page < 1) fail('page', m.pageInvalid);

  const size = parseInteger(query.size, DEFAULT_PAGE_SIZE);
  if (size === null || size < 1 || size > MAX_PAGE_SIZE) fail('size', m.sizeInvalid);

  const excludeClosedRaw = query.excludeClosed === undefined ? 'false' : asString(query.excludeClosed);
  if (excludeClosedRaw !== 'true' && excludeClosedRaw !== 'false') fail('excludeClosed', m.excludeClosedInvalid);

  if (fields.length > 0) throw new ApiError(400, 'INVALID_INPUT', m.invalidInput, fields);
  return { category, q, sort, tags, page, size, excludeClosed: excludeClosedRaw === 'true' };
}

module.exports = { parsePostId, parseListQuery, parseFeaturedQuery, parseRelatedQuery };
