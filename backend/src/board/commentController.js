'use strict';

const { ApiError } = require('../common/ApiError');
const { sendSuccess } = require('../common/response');
const { boardMessages } = require('./boardConstants');
const { parsePostId } = require('./boardValidator');

/** 경로의 postId 를 숫자로. 형식이 틀리면 404 */
function requirePostId(req) {
  const postId = parsePostId(req.params.postId);
  if (postId === null) throw new ApiError(404, 'POST_NOT_FOUND', boardMessages.postNotFound);
  return postId;
}

/** HTTP 요청/응답 변환만 담당하고 로직은 commentService 에 맡깁니다. */
function createCommentController(commentService) {
  async function list(req, res) {
    const data = await commentService.listComments(requirePostId(req), req.query, req.auth?.memberId ?? null);
    return sendSuccess(res, 200, data);
  }

  async function create(req, res) {
    const data = await commentService.createComment(requirePostId(req), req.auth.memberId, req.body);
    return sendSuccess(res, 201, data);
  }

  return { list, create };
}

module.exports = { createCommentController };
