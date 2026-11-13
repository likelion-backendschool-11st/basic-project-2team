'use strict';

const { ApiError } = require('../common/ApiError');
const { sendSuccess } = require('../common/response');
const { boardMessages } = require('./boardConstants');
const { parsePostId } = require('./boardValidator');

/** HTTP 요청/응답 변환만 담당하고 로직은 boardService 에 맡깁니다. */
function createBoardController(boardService) {
  async function getDetail(req, res) {
    const postId = parsePostId(req.params.postId);
    if (postId === null) throw new ApiError(404, 'POST_NOT_FOUND', boardMessages.postNotFound);

    const data = await boardService.getPostDetail(postId, req.auth?.memberId ?? null);
    return sendSuccess(res, 200, data);
  }

  async function related(req, res) {
    const postId = parsePostId(req.params.postId);
    if (postId === null) throw new ApiError(404, 'POST_NOT_FOUND', boardMessages.postNotFound);
    return sendSuccess(res, 200, await boardService.listRelated(postId, req.query));
  }

  async function list(req, res) {
    const data = await boardService.listPosts(req.query);
    return sendSuccess(res, 200, data);
  }

  const featured = (kind) => async (req, res) => sendSuccess(res, 200, await boardService.listFeatured(kind, req.query));

  return { getDetail, related, list, popular: featured('popular'), urgent: featured('urgent') };
}

module.exports = { createBoardController };
