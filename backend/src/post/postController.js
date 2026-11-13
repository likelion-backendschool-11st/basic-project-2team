'use strict';

const { sendSuccess } = require('../common/response');

/** HTTP 요청/응답 변환만 담당하고 로직은 postService 에 맡깁니다. */
function createPostController(postService) {
  async function create(req, res) {
    const data = await postService.createPost(req.auth.memberId, req.body);
    return sendSuccess(res, 201, data);
  }

  async function saveDraft(req, res) {
    return sendSuccess(res, 200, await postService.saveDraft(req.auth.memberId, req.body));
  }

  async function getLatestDraft(req, res) {
    return sendSuccess(res, 200, await postService.getLatestDraft(req.auth.memberId));
  }

  return { create, saveDraft, getLatestDraft };
}

module.exports = { createPostController };
