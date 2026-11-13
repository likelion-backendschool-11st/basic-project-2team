'use strict';

const { ApiError } = require('../common/ApiError');
const { sendSuccess } = require('../common/response');
const { boardMessages } = require('./boardConstants');
const { parsePostId } = require('./boardValidator');
const { commentMessages } = require('./commentConstants');
const { parseCommentId } = require('./commentValidator');

/** 경로의 postId 를 숫자로. 형식이 틀리면 404 */
function requirePostId(req) {
  const postId = parsePostId(req.params.postId);
  if (postId === null) throw new ApiError(404, 'POST_NOT_FOUND', boardMessages.postNotFound);
  return postId;
}

/** 경로의 commentId 를 숫자로. 형식이 틀리면 404 */
function requireCommentId(req) {
  const commentId = parseCommentId(req.params.commentId);
  if (commentId === null) throw new ApiError(404, 'COMMENT_NOT_FOUND', commentMessages.commentNotFound);
  return commentId;
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

  async function update(req, res) {
    const data = await commentService.updateComment(requireCommentId(req), req.auth.memberId, req.body);
    return sendSuccess(res, 200, data);
  }

  async function remove(req, res) {
    await commentService.deleteComment(requireCommentId(req), req.auth.memberId);
    return res.status(204).end();
  }

  async function report(req, res) {
    const data = await commentService.reportComment(req.auth.memberId, req.body);
    return sendSuccess(res, 201, data);
  }

  return { list, create, update, remove, report };
}

module.exports = { createCommentController };
