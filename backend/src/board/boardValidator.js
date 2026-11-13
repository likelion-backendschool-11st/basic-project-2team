'use strict';

const { POST_ID_PATTERN } = require('./boardConstants');

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

module.exports = { parsePostId };
