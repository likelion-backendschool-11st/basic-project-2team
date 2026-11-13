'use strict';

const { sendSuccess } = require('../common/response');
const { parseId } = require('./adminValidator');

/** 처리 이력에 남길 요청자 정보. req.admin 은 loadAdmin 이 채웁니다. */
const actorOf = (req) => ({ admin: req.admin, ip: req.ip });

/** HTTP 요청/응답 변환만 담당하고 로직은 adminService 에 맡깁니다. */
function createAdminController(adminService) {
  async function login(req, res) {
    const data = await adminService.login(req.body, { ip: req.ip });
    return sendSuccess(res, 200, data);
  }

  /** requireAdmin 이 검증한 토큰의 관리자 계정이 사용 가능한지 확인하고 req.admin 을 채웁니다. */
  async function loadAdmin(req, res, next) {
    req.admin = await adminService.getActiveAdmin(req.auth.adminId);
    return next();
  }

  async function me(req, res) {
    return sendSuccess(res, 200, req.admin);
  }

  async function dashboard(req, res) {
    return sendSuccess(res, 200, await adminService.getDashboard());
  }

  async function listReports(req, res) {
    return sendSuccess(res, 200, await adminService.listReports(req.query));
  }

  async function getReport(req, res) {
    return sendSuccess(res, 200, await adminService.getReport(parseId(req.params.reportId)));
  }

  async function processReport(req, res) {
    const data = await adminService.processReport(parseId(req.params.reportId), req.body, actorOf(req));
    return sendSuccess(res, 200, data);
  }

  async function listPosts(req, res) {
    return sendSuccess(res, 200, await adminService.listPosts(req.query));
  }

  async function getPost(req, res) {
    return sendSuccess(res, 200, await adminService.getPost(parseId(req.params.postId)));
  }

  async function deletePost(req, res) {
    await adminService.deletePost(parseId(req.params.postId), req.body, actorOf(req));
    return res.status(204).end();
  }

  async function listMembers(req, res) {
    return sendSuccess(res, 200, await adminService.listMembers(req.query));
  }

  async function getMember(req, res) {
    return sendSuccess(res, 200, await adminService.getMember(parseId(req.params.memberId), actorOf(req)));
  }

  async function sanctionMember(req, res) {
    const data = await adminService.sanctionMember(parseId(req.params.memberId), req.body, actorOf(req));
    return sendSuccess(res, 201, data);
  }

  async function listComments(req, res) {
    return sendSuccess(res, 200, await adminService.listComments(req.query));
  }

  async function updateComment(req, res) {
    const data = await adminService.updateComment(parseId(req.params.commentId), req.body, actorOf(req));
    return sendSuccess(res, 200, data);
  }

  async function history(req, res) {
    return sendSuccess(res, 200, await adminService.listHistory(req.query));
  }

  return {
    login,
    loadAdmin,
    me,
    dashboard,
    listReports,
    getReport,
    processReport,
    listPosts,
    getPost,
    deletePost,
    listMembers,
    getMember,
    sanctionMember,
    listComments,
    updateComment,
    history,
  };
}

module.exports = { createAdminController };
