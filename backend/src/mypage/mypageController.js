'use strict';

const { ApiError } = require('../common/ApiError');
const { sendSuccess } = require('../common/response');
const { mypageMessages } = require('./mypageConstants');
const { parseMemberId } = require('./mypageValidator');

/** 경로의 memberId. 형식이 틀리면 존재하지 않는 회원으로 봅니다. */
function requireMemberIdParam(req) {
  const memberId = parseMemberId(req.params.memberId);
  if (memberId === null) throw new ApiError(404, 'MEMBER_NOT_FOUND', mypageMessages.memberNotFound);
  return memberId;
}

/** HTTP 요청/응답 변환만 담당하고 로직은 mypageService 에 맡깁니다. */
function createMypageController(mypageService) {
  async function getMySummary(req, res) {
    return sendSuccess(res, 200, await mypageService.getMySummary(req.auth.memberId));
  }

  async function getMemberProfile(req, res) {
    const memberId = requireMemberIdParam(req);
    return sendSuccess(res, 200, await mypageService.getMemberProfile(memberId, req.auth?.memberId ?? null));
  }

  async function listMyPosts(req, res) {
    return sendSuccess(res, 200, await mypageService.listMyPosts(req.auth.memberId, req.query));
  }

  async function listMyApplications(req, res) {
    return sendSuccess(res, 200, await mypageService.listMyApplications(req.auth.memberId, req.query));
  }

  async function listMyComments(req, res) {
    return sendSuccess(res, 200, await mypageService.listMyComments(req.auth.memberId, req.query));
  }

  async function listFavorites(req, res) {
    return sendSuccess(res, 200, await mypageService.listFavorites(req.auth.memberId));
  }

  async function addFavorite(req, res) {
    await mypageService.addFavorite(req.auth.memberId, requireMemberIdParam(req));
    return res.status(204).end();
  }

  async function removeFavorite(req, res) {
    await mypageService.removeFavorite(req.auth.memberId, requireMemberIdParam(req));
    return res.status(204).end();
  }

  return {
    getMySummary,
    getMemberProfile,
    listMyPosts,
    listMyApplications,
    listMyComments,
    listFavorites,
    addFavorite,
    removeFavorite,
  };
}

module.exports = { createMypageController };
