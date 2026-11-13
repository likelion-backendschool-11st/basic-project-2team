'use strict';

const { sendSuccess } = require('../common/response');

/** HTTP 요청/응답 변환만 담당하고 로직은 partyService 에 맡깁니다. */
function createPartyController(partyService) {
  const memberId = (req) => req.auth.memberId;

  async function apply(req, res) {
    return sendSuccess(res, 201, await partyService.apply(req.params.postId, memberId(req), req.body));
  }

  async function cancelMine(req, res) {
    await partyService.cancelMine(req.params.postId, memberId(req));
    return res.status(204).end();
  }

  async function listApplications(req, res) {
    return sendSuccess(res, 200, await partyService.listApplications(req.params.postId, memberId(req), req.query));
  }

  async function decide(req, res) {
    return sendSuccess(res, 200, await partyService.decide(req.params.postId, req.params.applicationId, memberId(req), req.body));
  }

  async function changeStatus(req, res) {
    return sendSuccess(res, 200, await partyService.changeStatus(req.params.postId, memberId(req), req.body));
  }

  async function listParticipants(req, res) {
    return sendSuccess(res, 200, await partyService.listParticipants(req.params.postId));
  }

  return { apply, cancelMine, listApplications, decide, changeStatus, listParticipants };
}

module.exports = { createPartyController };
