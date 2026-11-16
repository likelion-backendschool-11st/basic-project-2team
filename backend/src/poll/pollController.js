'use strict';

const { ApiError } = require('../common/ApiError');
const { sendSuccess } = require('../common/response');
const { pollMessages } = require('./pollConstants');
const { parseId } = require('./pollValidator');

/** 경로의 postId 를 숫자로. 형식이 틀리면 404 */
function requirePostId(req) {
  const postId = parseId(req.params.postId);
  if (postId === null) throw new ApiError(404, 'POST_NOT_FOUND', pollMessages.postNotFound);
  return postId;
}

/** 경로의 pollId 를 숫자로. 형식이 틀리면 404 */
function requirePollId(req) {
  const pollId = parseId(req.params.pollId);
  if (pollId === null) throw new ApiError(404, 'POLL_NOT_FOUND', pollMessages.pollNotFound);
  return pollId;
}

/** HTTP 요청/응답 변환만 담당하고 로직은 pollService 에 맡깁니다. */
function createPollController(pollService) {
  async function get(req, res) {
    return sendSuccess(res, 200, await pollService.getPoll(requirePostId(req), req.auth?.memberId ?? null));
  }

  async function create(req, res) {
    return sendSuccess(res, 201, await pollService.createPoll(requirePostId(req), req.auth.memberId, req.body));
  }

  async function update(req, res) {
    return sendSuccess(res, 200, await pollService.updatePoll(requirePollId(req), req.auth.memberId, req.body));
  }

  async function vote(req, res) {
    return sendSuccess(res, 200, await pollService.vote(requirePollId(req), req.auth.memberId, req.body));
  }

  async function pin(req, res) {
    return sendSuccess(res, 200, await pollService.setPinned(requirePollId(req), req.auth.memberId, req.body));
  }

  async function close(req, res) {
    return sendSuccess(res, 200, await pollService.confirmPoll(requirePollId(req), req.auth.memberId, req.body));
  }

  async function remind(req, res) {
    return sendSuccess(res, 200, await pollService.remindVoters(requirePollId(req), req.auth.memberId));
  }

  return { get, create, update, vote, pin, close, remind };
}

module.exports = { createPollController };
