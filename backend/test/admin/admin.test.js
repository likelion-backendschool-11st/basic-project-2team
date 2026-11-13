'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createApp } = require('../../src/app');
const { createRecordingEvents } = require('../helpers/recordingEvents');

const AUTH = Object.freeze({
  jwtSecret: 'test-secret',
  accessTokenTtlSeconds: 1800,
  refreshTokenTtlDays: 1,
  rememberMeTtlDays: 14,
});
const NOW = new Date('2026-11-13T03:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;
const PASSWORD = 'admin123!';

/** DB 대신 메모리에 저장하는 가짜 repository. 목록 조회는 필터만 흉내 냅니다. */
function createFakeRepository() {
  const state = {};
  const reset = () =>
    Object.assign(state, {
      admins: [],
      members: [],
      posts: [],
      comments: [],
      reports: [],
      sanctions: [],
      notifications: [],
      logs: [],
    });
  reset();

  const byId = (list, id) => list.find((row) => row.id === id) ?? null;
  const snapshot = (row) => (row ? { ...row } : null);
  const pageOf = (rows, { offset, limit }) => ({ items: rows.slice(offset, offset + limit), totalCount: rows.length });
  const nickname = (id) => byId(state.members, id)?.nickname ?? null;

  const repo = {
    state,
    reset,
    async findAdminById(id) {
      return snapshot(byId(state.admins, id));
    },
    async findAdminByLoginId(loginId) {
      return snapshot(state.admins.find((a) => a.loginId === loginId));
    },
    async recordAdminLogin({ adminId, now }) {
      byId(state.admins, adminId).lastLoginAt = now;
    },
    async insertActionLog(log) {
      state.logs.push({ id: state.logs.length + 1, createdAt: NOW, ...log });
    },
    async listActionLogs({ actionTypes, offset, limit }) {
      const rows = state.logs
        .filter((l) => !actionTypes || actionTypes.includes(l.actionType))
        .map((l) => ({ ...l, adminName: byId(state.admins, l.adminId).name }))
        .reverse();
      return pageOf(rows, { offset, limit });
    },
    async listActionLogsByTarget({ targetType, targetId }) {
      return state.logs
        .filter((l) => l.targetType === targetType && l.targetId === targetId)
        .map((l) => ({ ...l, adminName: byId(state.admins, l.adminId).name }));
    },
    async insertNotification(notification) {
      state.notifications.push(notification);
    },
    async getDashboardCounts({ todayStart, recentSince }) {
      return {
        pendingReportCount: state.reports.filter((r) => ['PENDING', 'IN_PROGRESS'].includes(r.status)).length,
        todayReportCount: state.reports.filter((r) => r.createdAt >= todayStart).length,
        openPostCount: state.posts.filter((p) => p.status === 'OPEN').length,
        recentSanctionCount: state.sanctions.filter((s) => s.createdAt >= recentSince).length,
      };
    },
    async listRecentSanctions(limit) {
      return state.sanctions
        .slice(-limit)
        .reverse()
        .map((s) => ({ ...s, nickname: nickname(s.memberId) }));
    },
    async listReports({ status, type, offset, limit }) {
      const rows = state.reports
        .filter((r) => (!status || r.status === status) && (!type || r.targetType === type))
        .map((r) => ({
          ...r,
          targetNickname: nickname(r.targetMemberId),
          reporterNickname: nickname(r.reporterId),
        }));
      return pageOf(rows, { offset, limit });
    },
    async findReportById(id) {
      const r = byId(state.reports, id);
      if (!r) return null;
      const target = byId(state.members, r.targetMemberId);
      return {
        ...r,
        reporterNickname: nickname(r.reporterId),
        targetNickname: target.nickname,
        targetMannerTemp: target.mannerTemp,
        targetStatus: target.status,
      };
    },
    async lockReport(id) {
      return snapshot(byId(state.reports, id));
    },
    async updateReport({ id, status, action, memo, handledAt }) {
      Object.assign(byId(state.reports, id), { status, action, adminMemo: memo, handledAt });
    },
    async listPosts({ status, q, offset, limit, ...rest }) {
      state.lastPostQuery = { status, q, ...rest };
      const rows = state.posts.filter((p) => (!status || p.status === status) && (!q || p.title.includes(q)));
      return pageOf(rows, { offset, limit });
    },
    async findPostById(id) {
      return snapshot(byId(state.posts, id));
    },
    async listReportsByPost(postId) {
      return state.reports
        .filter((r) => r.targetType === 'POST' && r.targetId === postId)
        .map((r) => ({ ...r, reporterNickname: nickname(r.reporterId) }));
    },
    async lockPost(id) {
      return snapshot(byId(state.posts, id));
    },
    async deletePost({ id, adminId, reason, now }) {
      Object.assign(byId(state.posts, id), { status: 'DELETED', deletedAt: now, deletedBy: adminId, deleteReason: reason });
    },
    async listMembers({ status, offset, limit }) {
      return pageOf(
        state.members.filter((m) => !status || m.status === status),
        { offset, limit },
      );
    },
    async findMemberById(id) {
      const m = byId(state.members, id);
      return m && { ...m, postCount: 0, partyCount: 0, noShowCount: 0, reportCount: 0 };
    },
    async listGameProfiles() {
      return [];
    },
    async listSanctionsByMember(memberId) {
      return state.sanctions.filter((s) => s.memberId === memberId);
    },
    async lockMember(id) {
      return snapshot(byId(state.members, id));
    },
    async updateMemberStatus({ id, status, suspendedUntil }) {
      Object.assign(byId(state.members, id), { status, suspendedUntil });
    },
    async insertSanction(sanction) {
      const id = state.sanctions.length + 1;
      state.sanctions.push({ id, createdAt: NOW, ...sanction });
      return id;
    },
    async listComments({ status, offset, limit }) {
      const viewStatus = (c) => (c.status === 'VISIBLE' && c.reportCount > 0 ? 'REPORTED' : c.status);
      return pageOf(
        state.comments.filter((c) => !status || viewStatus(c) === status),
        { offset, limit },
      );
    },
    async lockComment(id) {
      return snapshot(byId(state.comments, id));
    },
    async updateCommentStatus({ id, status, deletedAt }) {
      const c = byId(state.comments, id);
      Object.assign(c, { status, deletedAt: deletedAt ?? c.deletedAt });
    },
    async decrementCommentCount(postId) {
      const p = byId(state.posts, postId);
      p.commentCount = Math.max(0, p.commentCount - 1);
    },
    /** 실제 트랜잭션처럼, 실패하면 상태를 되돌립니다. */
    async withTransaction(fn) {
      const backup = structuredClone(state);
      try {
        return await fn(repo);
      } catch (err) {
        Object.assign(state, backup);
        throw err;
      }
    },
  };
  return repo;
}

describe('admin API', () => {
  let server;
  let baseUrl;
  let repo;
  let passwordHash;
  const events = createRecordingEvents();

  before(async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 4);
    repo = createFakeRepository();
    const app = createApp({
      postEvents: events,
      adminRepository: repo,
      memberRepository: {},
      corsOrigins: ['http://localhost:5173'],
      bcryptRounds: 4,
      auth: AUTH,
      now: () => NOW,
    });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(() => new Promise((resolve) => server.close(resolve)));

  beforeEach(() => {
    events.log.length = 0;
    repo.reset();
    repo.state.admins.push(
      { id: 1, loginId: 'master', passwordHash, name: '관리자 마스터', role: 'ADMIN', status: 'ACTIVE' },
      { id: 2, loginId: 'retired', passwordHash, name: '퇴직 관리자', role: 'ADMIN', status: 'DISABLED' },
    );
    repo.state.members.push(
      { id: 10, nickname: '신고자', loginId: 'reporter', status: 'ACTIVE', suspendedUntil: null, mannerTemp: '36.5' },
      { id: 11, nickname: '비매너', loginId: 'toxic', status: 'ACTIVE', suspendedUntil: null, mannerTemp: '20.1' },
      { id: 12, nickname: null, loginId: null, status: 'WITHDRAWN', suspendedUntil: null, mannerTemp: '36.5' },
    );
    repo.state.posts.push({
      id: 100,
      authorId: 11,
      title: '광고 공고',
      status: 'OPEN',
      commentCount: 1,
      currentCount: 1,
      headcount: 4,
      reportCount: 1,
    });
    repo.state.comments.push({ id: 200, postId: 100, authorId: 11, content: '욕설', status: 'VISIBLE', reportCount: 2 });
    repo.state.reports.push(
      { id: 1, reporterId: 10, targetType: 'MEMBER', targetId: 11, targetMemberId: 11, reasonCode: '욕설', status: 'PENDING', createdAt: NOW },
      { id: 2, reporterId: 10, targetType: 'POST', targetId: 100, targetMemberId: 11, reasonCode: '광고', status: 'PENDING', createdAt: new Date(NOW.getTime() - 2 * DAY_MS) },
      { id: 3, reporterId: 10, targetType: 'COMMENT', targetId: 200, targetMemberId: 11, reasonCode: '욕설', status: 'DONE', createdAt: NOW },
    );
  });

  const adminToken = (adminId = 1) =>
    jwt.sign({ typ: 'admin' }, AUTH.jwtSecret, { algorithm: 'HS256', subject: String(adminId), expiresIn: 60 });

  const request = (method, path, { body, token = adminToken() } = {}) =>
    fetch(`${baseUrl}/api/admin${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  const json = async (res) => ({ status: res.status, body: await res.json() });

  describe('인증', () => {
    it('관리자 로그인 성공 시 관리자 토큰을 발급하고 로그인 이력을 남긴다', async () => {
      const { status, body } = await json(
        await request('POST', '/auth/login', { body: { userId: 'master', password: PASSWORD }, token: null }),
      );
      assert.equal(status, 200);
      assert.deepEqual(body.data.admin, { id: 1, userId: 'master', name: '관리자 마스터', role: 'ADMIN' });
      assert.equal(jwt.verify(body.data.accessToken, AUTH.jwtSecret).typ, 'admin');
      assert.equal(repo.state.logs.at(-1).actionType, 'ADMIN_LOGIN');

      const me = await json(await request('GET', '/me', { token: body.data.accessToken }));
      assert.equal(me.body.data.name, '관리자 마스터');
    });

    it('아이디·비밀번호가 틀리면 401, 비활성 계정은 403', async () => {
      const wrong = await request('POST', '/auth/login', { body: { userId: 'master', password: 'nope' }, token: null });
      assert.equal(wrong.status, 401);
      const unknown = await request('POST', '/auth/login', { body: { userId: 'ghost', password: PASSWORD }, token: null });
      assert.equal((await json(unknown)).body.error.code, 'INVALID_CREDENTIALS');
      const inactive = await request('POST', '/auth/login', { body: { userId: 'retired', password: PASSWORD }, token: null });
      assert.equal((await json(inactive)).body.error.code, 'ADMIN_INACTIVE');
    });

    it('토큰이 없거나 회원 토큰이면 401, 비활성 관리자 토큰이면 403', async () => {
      assert.equal((await request('GET', '/dashboard', { token: null })).status, 401);
      const memberToken = jwt.sign({ typ: 'access' }, AUTH.jwtSecret, { subject: '1', expiresIn: 60 });
      assert.equal((await request('GET', '/dashboard', { token: memberToken })).status, 401);
      assert.equal((await request('GET', '/dashboard', { token: adminToken(2) })).status, 403);
    });
  });

  it('대시보드: 미처리·오늘 신고, 모집 중 공고, 최근 제재 수', async () => {
    const { status, body } = await json(await request('GET', '/dashboard'));
    assert.equal(status, 200);
    assert.equal(body.data.pendingReportCount, 2);
    assert.equal(body.data.todayReportCount, 2);
    assert.equal(body.data.openPostCount, 1);
    assert.equal(body.data.recentSanctionCount, 0);
  });

  describe('신고', () => {
    it('목록은 페이지네이션 형식으로, 잘못된 필터는 400', async () => {
      const { body } = await json(await request('GET', '/reports?status=PENDING&size=1'));
      assert.deepEqual(
        { page: body.data.page, size: body.data.size, totalCount: body.data.totalCount, totalPages: body.data.totalPages },
        { page: 1, size: 1, totalCount: 2, totalPages: 2 },
      );
      assert.equal(body.data.items[0].target.nickname, '비매너');

      const bad = await json(await request('GET', '/reports?status=접수&page=0'));
      assert.equal(bad.status, 400);
      assert.deepEqual(bad.body.error.fields.map((f) => f.field).sort(), ['page', 'status']);
    });

    it('상세는 피신고 회원 정보와 제재 이력을 포함하고, 없으면 404', async () => {
      const { body } = await json(await request('GET', '/reports/1'));
      assert.equal(body.data.target.mannerTemp, 20.1);
      assert.deepEqual(body.data.sanctions, []);
      assert.equal((await request('GET', '/reports/999')).status, 404);
      assert.equal((await request('GET', '/reports/abc')).status, 400);
    });

    it('DONE + SUSPEND: 제재·회원 정지·알림·이력을 함께 남긴다', async () => {
      const { status, body } = await json(
        await request('PATCH', '/reports/1', { body: { status: 'DONE', action: 'SUSPEND', days: 7, memo: '욕설 확인' } }),
      );
      assert.equal(status, 200);
      assert.deepEqual(body.data, { id: 1, status: 'DONE', action: 'SUSPEND' });

      const [sanction] = repo.state.sanctions;
      assert.equal(sanction.type, 'SUSPEND');
      assert.equal(sanction.reportId, 1);
      assert.equal(sanction.endsAt.getTime(), NOW.getTime() + 7 * DAY_MS);
      const member = repo.state.members.find((m) => m.id === 11);
      assert.equal(member.status, 'SUSPENDED');
      assert.equal(member.suspendedUntil.getTime(), NOW.getTime() + 7 * DAY_MS);
      assert.equal(repo.state.notifications[0].type, 'SANCTION');
      assert.equal(repo.state.reports[0].handledAt, NOW);
      assert.equal(repo.state.logs.at(-1).actionType, 'REPORT_PROCESS');

      const again = await json(await request('PATCH', '/reports/1', { body: { status: 'REJECTED' } }));
      assert.equal(again.body.error.code, 'REPORT_ALREADY_HANDLED');
    });

    it('DONE + DELETE_CONTENT: 신고된 공고를 삭제하고 작성자에게 알린다', async () => {
      const res = await request('PATCH', '/reports/2', { body: { status: 'DONE', action: 'DELETE_CONTENT' } });
      assert.equal(res.status, 200);
      assert.equal(repo.state.posts[0].status, 'DELETED');
      assert.equal(repo.state.notifications[0].type, 'POST_DELETED');
    });

    it('회원 신고에 DELETE_CONTENT 는 400, 실패하면 아무것도 바뀌지 않는다', async () => {
      const { body } = await json(await request('PATCH', '/reports/1', { body: { status: 'DONE', action: 'DELETE_CONTENT' } }));
      assert.equal(body.error.code, 'INVALID_REPORT_ACTION');
      assert.equal(repo.state.reports[0].status, 'PENDING');
      assert.equal(repo.state.logs.length, 0);
    });

    it('입력 규칙: DONE 은 action 필수, SUSPEND 는 days 필수, 그 외 상태엔 action 불가', async () => {
      const cases = [
        [{ status: 'DONE' }, 'action'],
        [{ status: 'DONE', action: 'SUSPEND' }, 'days'],
        [{ status: 'DONE', action: 'WARN', days: 3 }, 'days'],
        [{ status: 'IN_PROGRESS', action: 'BAN' }, 'action'],
        [{ status: 'PENDING' }, 'status'],
      ];
      for (const [body, field] of cases) {
        const res = await json(await request('PATCH', '/reports/1', { body }));
        assert.equal(res.status, 400, JSON.stringify(body));
        assert.deepEqual(res.body.error.fields.map((f) => f.field), [field], JSON.stringify(body));
      }
    });

    it('REJECTED 는 DISMISS 로 기록하고 제재하지 않는다', async () => {
      const { body } = await json(await request('PATCH', '/reports/1', { body: { status: 'REJECTED', memo: '증빙 부족' } }));
      assert.equal(body.data.action, 'DISMISS');
      assert.equal(repo.state.sanctions.length, 0);
    });
  });

  describe('실시간 신호 (SSE)', () => {
    it('관리자가 공고를 삭제하면 post, 댓글을 가림·복구·삭제하면 comments 신호를 커밋 뒤에 보낸다', async () => {
      await request('PATCH', '/comments/200', { body: { status: 'HIDDEN', reason: '욕설' } });
      await request('PATCH', '/comments/200', { body: { status: 'VISIBLE', reason: '오신고' } });
      await request('DELETE', '/posts/100', { body: { reason: '허위 공고' } });
      assert.deepEqual(events.log, [[100, 'comments'], [100, 'comments'], [100, 'post']]);
    });

    it('실패한 처리(사유 없음 · 이미 삭제 · 없는 대상)는 신호를 보내지 않는다', async () => {
      await request('DELETE', '/posts/100', { body: {} });
      await request('DELETE', '/posts/999', { body: { reason: 'x' } });
      await request('PATCH', '/comments/999', { body: { status: 'HIDDEN', reason: 'x' } });
      assert.deepEqual(events.log, []);
    });

    it('신고 처리에서 공고·댓글을 삭제(DELETE_CONTENT)하면 신호를 보낸다', async () => {
      await request('PATCH', '/reports/2', { body: { status: 'DONE', action: 'DELETE_CONTENT', memo: '광고' } });
      assert.deepEqual(events.log, [[100, 'post']]);
    });
  });

  describe('공고', () => {
    it('삭제는 사유가 필요하고, 이미 삭제된 공고는 409', async () => {
      assert.equal((await request('DELETE', '/posts/100', { body: {} })).status, 400);
      assert.equal((await request('DELETE', '/posts/100', { body: { reason: '허위 공고' } })).status, 204);
      assert.equal(repo.state.posts[0].deleteReason, '허위 공고');
      assert.equal(repo.state.logs.at(-1).detail.targetLabel, '광고 공고');
      const again = await json(await request('DELETE', '/posts/100', { body: { reason: '허위 공고' } }));
      assert.equal(again.body.error.code, 'POST_ALREADY_DELETED');
      assert.equal((await request('DELETE', '/posts/999', { body: { reason: 'x' } })).status, 404);
    });

    it('목록은 상태로 거르고, 상세는 처리 이력을 포함한다', async () => {
      const list = await json(await request('GET', '/posts?status=OPEN'));
      assert.equal(list.body.data.totalCount, 1);
      const detail = await json(await request('GET', '/posts/100'));
      assert.equal(detail.body.data.title, '광고 공고');
      assert.deepEqual(detail.body.data.logs, []);
      assert.deepEqual(
        detail.body.data.reports.map((r) => [r.id, r.reporter]),
        [[2, '신고자']],
      );
    });

    it('기간(한국 시간)·정렬·게임·신고 여부 필터를 repository 로 넘기고, 형식이 틀리면 400', async () => {
      await request('GET', '/posts?from=2026-11-01&to=2026-11-13&sort=asc&game=lol&reported=true');
      assert.deepEqual(repo.state.lastPostQuery, {
        page: 1,
        size: 10,
        status: null,
        q: null,
        createdFrom: new Date('2026-10-31T15:00:00Z'),
        createdBefore: new Date('2026-11-13T15:00:00Z'),
        sort: 'ASC',
        reported: true,
        game: 'lol',
      });

      const bad = await json(await request('GET', '/posts?from=2026-02-30&to=2026-01-01&sort=old&reported=yes'));
      assert.equal(bad.status, 400);
      assert.deepEqual(bad.body.error.fields.map((f) => f.field).sort(), ['from', 'reported', 'sort']);
      const reversed = await json(await request('GET', '/posts?from=2026-11-13&to=2026-11-01'));
      assert.deepEqual(reversed.body.error.fields.map((f) => f.field), ['to']);
    });
  });

  describe('회원', () => {
    it('상세 조회는 접근 이력(MEMBER_VIEW)을 남긴다', async () => {
      const { body } = await json(await request('GET', '/members/11'));
      assert.equal(body.data.mannerTemp, 20.1);
      assert.equal(repo.state.logs.at(-1).actionType, 'MEMBER_VIEW');
    });

    it('경고는 이미 정지 중인 회원의 상태를 낮추지 않는다', async () => {
      await request('POST', '/members/11/sanctions', { body: { type: 'SUSPEND', days: 3, reason: '노쇼' } });
      const { status, body } = await json(
        await request('POST', '/members/11/sanctions', { body: { type: 'WARNING', reason: '비매너' } }),
      );
      assert.equal(status, 201);
      assert.equal(body.data.memberStatus, 'SUSPENDED');
      assert.equal(body.data.suspendedUntil, new Date(NOW.getTime() + 3 * DAY_MS).toISOString());
    });

    it('영구 정지된 회원·탈퇴 회원은 409, 없는 회원은 404', async () => {
      assert.equal((await request('POST', '/members/11/sanctions', { body: { type: 'BAN', reason: '사기' } })).status, 201);
      const banned = await json(await request('POST', '/members/11/sanctions', { body: { type: 'WARNING', reason: 'x' } }));
      assert.equal(banned.body.error.code, 'MEMBER_ALREADY_BANNED');
      const withdrawn = await json(await request('POST', '/members/12/sanctions', { body: { type: 'WARNING', reason: 'x' } }));
      assert.equal(withdrawn.body.error.code, 'MEMBER_WITHDRAWN');
      assert.equal((await request('POST', '/members/999/sanctions', { body: { type: 'WARNING', reason: 'x' } })).status, 404);
    });

    it('제재 입력 규칙: type, days(SUSPEND 만), reason', async () => {
      const res = await json(await request('POST', '/members/11/sanctions', { body: { type: 'SUSPEND', days: 0 } }));
      assert.deepEqual(res.body.error.fields.map((f) => f.field), ['days', 'reason']);
    });
  });

  describe('댓글', () => {
    it('신고된 댓글은 REPORTED 로 보이고, 가림 → 복구 → 삭제 순으로 처리된다', async () => {
      const list = await json(await request('GET', '/comments?status=REPORTED'));
      assert.equal(list.body.data.items[0].status, 'REPORTED');

      assert.equal((await request('PATCH', '/comments/200', { body: { status: 'HIDDEN', reason: '욕설' } })).status, 200);
      const same = await json(await request('PATCH', '/comments/200', { body: { status: 'HIDDEN', reason: '욕설' } }));
      assert.equal(same.body.error.code, 'COMMENT_STATUS_UNCHANGED');
      assert.equal((await request('PATCH', '/comments/200', { body: { status: 'VISIBLE', reason: '오신고' } })).status, 200);
      assert.equal((await request('PATCH', '/comments/200', { body: { status: 'DELETED', reason: '욕설' } })).status, 200);
      assert.equal(repo.state.posts[0].commentCount, 0);

      const after = await json(await request('PATCH', '/comments/200', { body: { status: 'VISIBLE', reason: 'x' } }));
      assert.equal(after.body.error.code, 'COMMENT_ALREADY_DELETED');
      assert.deepEqual(
        repo.state.logs.map((l) => l.actionType),
        ['COMMENT_HIDE', 'COMMENT_RESTORE', 'COMMENT_DELETE'],
      );
    });
  });

  it('처리 이력은 kind 로 거르고, 알 수 없는 kind 는 400', async () => {
    await request('POST', '/members/11/sanctions', { body: { type: 'WARNING', reason: '비매너' } });
    await request('GET', '/members/11');
    const { body } = await json(await request('GET', '/history?kind=SANCTION'));
    assert.equal(body.data.totalCount, 1);
    assert.equal(body.data.items[0].kind, 'SANCTION');
    assert.equal(body.data.items[0].adminName, '관리자 마스터');
    assert.equal((await request('GET', '/history?kind=ETC')).status, 400);
    assert.equal((await request('GET', '/history?kind=MEMBER_VIEW')).status, 400);
  });

  it('회원 상세 조회(MEMBER_VIEW)는 처리 이력 목록에 나오지 않는다', async () => {
    await request('POST', '/members/11/sanctions', { body: { type: 'WARNING', reason: '비매너' } });
    await request('GET', '/members/11');
    const { body } = await json(await request('GET', '/history'));
    assert.equal(repo.state.logs.at(-1).actionType, 'MEMBER_VIEW');
    assert.ok(body.data.items.length > 0);
    assert.ok(body.data.items.every((h) => h.actionType !== 'MEMBER_VIEW'));
  });
});
