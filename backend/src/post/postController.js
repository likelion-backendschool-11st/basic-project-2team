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

  async function remove(req, res) {
    await postService.deletePost(req.params.postId, req.auth.memberId);
    return res.status(204).end();
  }

  async function changeStatus(req, res) {
    return sendSuccess(res, 200, await postService.changePostStatus(req.params.postId, req.auth.memberId, req.body));
  }

  return { create, saveDraft, getLatestDraft, remove, changeStatus };
}

module.exports = { createPostController };
