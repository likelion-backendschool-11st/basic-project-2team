'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../../src/app');
const { createTokenProvider } = require('../../src/common/tokenProvider');

const AUTH = Object.freeze({ jwtSecret: 'test-secret', accessTokenTtlSeconds: 1800, refreshTokenTtlDays: 1, rememberMeTtlDays: 14 });
const NOW = new Date('2026-11-14T00:00:00Z');
const HOST = 1;
const A = 2;
const B = 3;
const C = 4;

/** DB 대신 메모리에 저장하는 가짜 repository. 승인·취소의 인원 계산은 실제 repository 와 같은 규칙입니다. */
function createFakeRepository() {
  const state = { posts: new Map(), members: new Map(), applications: [], notifications: [], nextId: 1 };
  const notify = (memberId, type, message) => state.notifications.push({ memberId, type, message });
  const find = (postId, memberId) => state.applications.find((a) => a.postId === postId && a.applicantId === memberId);
  const memberRow = (id) => ({ memberId: id, nickname: `회원${id}`, avatarUrl: null, level: 1, mannerTemp: '36.5', reviewCount: 0, memberStatus: state.members.get(id)?.status ?? 'ACTIVE' });
  return {
    state,
    async findPost(postId) {
      const p = state.posts.get(postId);
      return p && p.status !== 'DELETED' ? { id: postId, ...p } : null;
    },
    async findMemberStatus(memberId) {
      return { nickname: `회원${memberId}`, status: 'ACTIVE', suspendedUntil: null, ...state.members.get(memberId) };
    },
    async findMyApplication(postId, memberId) {
      const a = find(postId, memberId);
      return a ? { id: a.id, status: a.status } : null;
    },
    async createApplication({ postId, applicantId, role, message, notice }) {
      if (find(postId, applicantId)) return null;
      notify(notice.memberId, notice.type, notice.message);
      const a = { id: state.nextId++, postId, applicantId, role, message, status: 'PENDING', lateCancel: false };
      state.applications.push(a);
      return a.id;
    },
    async reapply({ id, role, message, notice }) {
      const a = state.applications.find((x) => x.id === id);
      if (a.status !== 'CANCELED') return false;
      notify(notice.memberId, notice.type, notice.message);
      Object.assign(a, { status: 'PENDING', role, message });
      return true;
    },
    async cancelApplication({ postId, applicantId, lateCancel, notice }) {
      const a = find(postId, applicantId);
      if (!a || !['PENDING', 'ACCEPTED'].includes(a.status)) return false;
      if (a.status === 'ACCEPTED') {
        notify(notice.memberId, notice.type, notice.message);
        const post = state.posts.get(postId);
        if (post.status === 'CLOSED' && post.currentCount >= post.headcount) post.status = 'OPEN';
        post.currentCount -= 1;
        a.lateCancel = a.lateCancel || lateCancel;
      }
      a.status = 'CANCELED';
      return true;
    },
    async findApplications(postId, status) {
      return state.applications
        .filter((a) => a.postId === postId && ['PENDING', 'ACCEPTED', 'REJECTED'].includes(a.status) && (!status || a.status === status))
        .map((a) => ({ ...a, appliedAt: NOW, ...memberRow(a.applicantId) }));
    },
    async decideApplication({ postId, applicationId, status, notices }) {
      const post = state.posts.get(postId);
      const a = state.applications.find((x) => x.id === applicationId && x.postId === postId);
      if (!a) return { result: 'NOT_FOUND' };
      if (a.status !== 'PENDING') return { result: 'ALREADY_DECIDED' };
      if (status === 'ACCEPTED') {
        if (post.currentCount >= post.headcount) return { result: 'FULL' };
        if (post.status !== 'OPEN') return { result: 'POST_CLOSED' };
        post.currentCount += 1;
        if (post.currentCount >= post.headcount) post.status = 'CLOSED';
      }
      a.status = status;
      notify(a.applicantId, 'APPLICATION_RESULT', status === 'ACCEPTED' ? notices.accepted : notices.rejected);
      if (post.status === 'CLOSED' && status === 'ACCEPTED' && post.currentCount >= post.headcount) {
        state.applications.filter((x) => x.postId === postId && x.status === 'PENDING').forEach((x) => notify(x.applicantId, 'POST_UPDATED', notices.closed));
      }
      return { result: 'OK', current: post.currentCount, max: post.headcount, postStatus: post.status };
    },
    async changePostStatus({ postId, status, now, notice }) {
      const post = state.posts.get(postId);
      const out = () => ({ result: 'OK', status: post.status, current: post.currentCount, max: post.headcount });
      if (post.status === status) return out();
      if (post.status === 'COMPLETED') return { result: 'COMPLETED' };
      if (status === 'OPEN' && post.currentCount >= post.headcount) return { result: 'FULL' };
      if (status === 'COMPLETED') {
        if (post.currentCount <= 1) return { result: 'NO_MEMBERS' };
        if (post.scheduleAt && post.scheduleAt > now) return { result: 'NOT_STARTED' };
      }
      post.status = status;
      if (notice) {
        state.applications.filter((x) => x.postId === postId && ['PENDING', 'ACCEPTED'].includes(x.status)).forEach((x) => notify(x.applicantId, 'POST_UPDATED', notice));
      }
      return out();
    },
    async findParticipants(postId) {
      const post = state.posts.get(postId);
      const accepted = state.applications.filter((a) => a.postId === postId && a.status === 'ACCEPTED');
      return [
        { ...memberRow(post.authorId), role: null, isHost: 1 },
        ...accepted.map((a) => ({ ...memberRow(a.applicantId), role: a.role, isHost: 0 })),
      ];
    },
  };
}

describe('party application API', () => {
  let server;
  let baseUrl;
  const repo = createFakeRepository();
  const tokens = createTokenProvider(AUTH);

  before(async () => {
    const app = createApp({ partyRepository: repo, corsOrigins: [], bcryptRounds: 4, auth: AUTH, now: () => NOW });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://localhost:${server.address().port}`;
  });
  after(() => server.close());
  beforeEach(() => {
    Object.assign(repo.state, { applications: [], notifications: [], nextId: 1 });
    repo.state.members.clear();
    repo.state.posts.clear();
    repo.state.posts.set(1, { authorId: HOST, title: '카멘 하드 숙련팟', status: 'OPEN', headcount: 3, currentCount: 1, scheduleAt: new Date('2026-11-14T12:00:00Z') });
  });

  const call = (method, path, body, memberId) =>
    fetch(`${baseUrl}/api/posts${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(memberId ? { Authorization: `Bearer ${tokens.createAccessToken(memberId)}` } : {}) },
      body: body && JSON.stringify(body),
    });
  const json = async (res) => (await res.json());
  const apply = (memberId, body = {}) => call('POST', '/1/applications', body, memberId);
  const decide = (id, status, memberId = HOST) => call('PATCH', `/1/applications/${id}`, { status }, memberId);

  describe('POST /:postId/applications', () => {
    it('신청하면 201 PENDING 이고 포지션·메시지는 다듬어 저장한다', async () => {
      const res = await apply(A, { role: ' 서포터 ', message: '' });
      assert.equal(res.status, 201);
      assert.deepEqual((await json(res)).data, { id: 1, status: 'PENDING' });
      assert.deepEqual([repo.state.applications[0].role, repo.state.applications[0].message], ['서포터', null]);
    });

    it('본문 없이도 신청할 수 있다', async () => {
      assert.equal((await call('POST', '/1/applications', undefined, A)).status, 201);
    });

    it('중복 신청은 409 ALREADY_APPLIED', async () => {
      await apply(A);
      const res = await apply(A);
      assert.equal(res.status, 409);
      assert.equal((await json(res)).error.code, 'ALREADY_APPLIED');
    });

    it('본인 공고는 403 CANNOT_APPLY_OWN_POST', async () => {
      const res = await apply(HOST);
      assert.equal(res.status, 403);
      assert.equal((await json(res)).error.code, 'CANNOT_APPLY_OWN_POST');
    });

    it('마감·완료 공고는 409 POST_CLOSED, 정원이 찬 공고는 409 PARTY_FULL', async () => {
      repo.state.posts.get(1).status = 'CLOSED';
      assert.equal((await json(await apply(A))).error.code, 'POST_CLOSED');
      repo.state.posts.get(1).status = 'OPEN';
      repo.state.posts.get(1).currentCount = 3;
      assert.equal((await json(await apply(A))).error.code, 'PARTY_FULL');
    });

    it('취소한 신청은 같은 행으로 다시 신청할 수 있고, 거절·노쇼는 403 REAPPLY_NOT_ALLOWED', async () => {
      await apply(A);
      await call('DELETE', '/1/applications/me', undefined, A);
      const res = await apply(A, { role: '딜러' });
      assert.equal(res.status, 201);
      assert.deepEqual([repo.state.applications.length, repo.state.applications[0].status, repo.state.applications[0].role], [1, 'PENDING', '딜러']);

      for (const status of ['REJECTED', 'NO_SHOW']) {
        repo.state.applications[0].status = status;
        const again = await apply(A);
        assert.equal(again.status, 403, status);
        assert.equal((await json(again)).error.code, 'REAPPLY_NOT_ALLOWED');
      }
    });

    it('영구 정지·정지 중인 회원은 403, 기간이 끝난 정지는 허용', async () => {
      repo.state.members.set(A, { status: 'BANNED' });
      assert.equal((await json(await apply(A))).error.code, 'ACCOUNT_BANNED');
      repo.state.members.set(A, { status: 'SUSPENDED', suspendedUntil: new Date('2026-12-01T00:00:00Z') });
      assert.equal((await json(await apply(A))).error.code, 'ACCOUNT_SUSPENDED');
      repo.state.members.set(A, { status: 'SUSPENDED', suspendedUntil: new Date('2026-11-01T00:00:00Z') });
      assert.equal((await apply(A)).status, 201);
    });

    it('길이를 넘는 값은 필드별 400, 없는·삭제된·형식 틀린 공고는 404, 비로그인은 401', async () => {
      const bad = await apply(A, { role: 'a'.repeat(31), message: 'b'.repeat(201) });
      assert.equal(bad.status, 400);
      assert.deepEqual((await json(bad)).error.fields.map((f) => f.field), ['role', 'message']);
      repo.state.posts.get(1).status = 'DELETED';
      for (const id of ['1', '999', 'abc', '0']) assert.equal((await call('POST', `/${id}/applications`, {}, A)).status, 404, id);
      assert.equal((await call('POST', '/1/applications', {})).status, 401);
    });
  });

  describe('DELETE /:postId/applications/me', () => {
    it('대기 중 신청을 취소하면 204 이고 인원은 그대로다', async () => {
      await apply(A);
      assert.equal((await call('DELETE', '/1/applications/me', undefined, A)).status, 204);
      assert.deepEqual([repo.state.applications[0].status, repo.state.posts.get(1).currentCount], ['CANCELED', 1]);
    });

    it('수락된 신청을 취소하면 인원이 줄고, 출발 3시간 이내면 late_cancel 로 기록한다', async () => {
      await apply(A);
      await decide(1, 'ACCEPTED');
      repo.state.posts.get(1).scheduleAt = new Date('2026-11-14T02:00:00Z'); // NOW 로부터 2시간 뒤
      await call('DELETE', '/1/applications/me', undefined, A);
      assert.deepEqual(
        [repo.state.applications[0].status, repo.state.applications[0].lateCancel, repo.state.posts.get(1).currentCount],
        ['CANCELED', true, 1],
      );
    });

    it('late_cancel 기록은 재신청해도, 이후 여유 있게 취소해도 지워지지 않는다', async () => {
      await apply(A);
      await decide(1, 'ACCEPTED');
      repo.state.posts.get(1).scheduleAt = new Date('2026-11-14T02:00:00Z');
      await call('DELETE', '/1/applications/me', undefined, A);
      await apply(A);
      assert.equal(repo.state.applications[0].lateCancel, true);
      await decide(1, 'ACCEPTED');
      repo.state.posts.get(1).scheduleAt = new Date('2026-11-20T00:00:00Z');
      await call('DELETE', '/1/applications/me', undefined, A);
      assert.equal(repo.state.applications[0].lateCancel, true);
    });

    it('출발까지 여유가 있으면 late_cancel 이 아니다', async () => {
      await apply(A);
      await decide(1, 'ACCEPTED');
      await call('DELETE', '/1/applications/me', undefined, A);
      assert.equal(repo.state.applications[0].lateCancel, false);
    });

    it('신청한 적 없거나 이미 취소·거절된 경우 404 APPLICATION_NOT_FOUND, 완료된 파티는 409', async () => {
      assert.equal((await json(await call('DELETE', '/1/applications/me', undefined, A))).error.code, 'APPLICATION_NOT_FOUND');
      await apply(B);
      await decide(1, 'REJECTED');
      assert.equal((await call('DELETE', '/1/applications/me', undefined, B)).status, 404);
      repo.state.posts.get(1).status = 'COMPLETED';
      assert.equal((await json(await call('DELETE', '/1/applications/me', undefined, B))).error.code, 'POST_COMPLETED');
    });
  });

  describe('GET /:postId/applications', () => {
    it('작성자는 취소를 뺀 신청자 목록을 받고 status 로 거를 수 있다', async () => {
      await apply(A, { role: '서포터', message: '잘 부탁드려요' });
      await apply(B);
      await apply(C);
      await call('DELETE', '/1/applications/me', undefined, C);
      await decide(1, 'ACCEPTED');

      const { data } = await json(await call('GET', '/1/applications', undefined, HOST));
      assert.deepEqual(data.map((a) => [a.id, a.status]), [[1, 'ACCEPTED'], [2, 'PENDING']]);
      assert.deepEqual(data[0].applicant, { id: A, nickname: '회원2', avatarUrl: null, level: 1, mannerTemp: 36.5, reviewCount: 0 });
      assert.equal(data[0].role, '서포터');

      const pending = await json(await call('GET', '/1/applications?status=PENDING', undefined, HOST));
      assert.deepEqual(pending.data.map((a) => a.id), [2]);
    });

    it('작성자가 아니면 403, 잘못된 status 는 400, 탈퇴한 신청자는 닉네임을 가린다', async () => {
      assert.equal((await json(await call('GET', '/1/applications', undefined, A))).error.code, 'NOT_POST_AUTHOR');
      assert.equal((await call('GET', '/1/applications?status=CANCELED', undefined, HOST)).status, 400);
      await apply(A);
      repo.state.members.set(A, { status: 'WITHDRAWN' });
      // 탈퇴 회원은 신청 자체가 막히므로 신청 후 상태만 바꿔 확인
      const { data } = await json(await call('GET', '/1/applications', undefined, HOST));
      assert.equal(data[0].applicant.nickname, '탈퇴한 회원');
    });
  });

  describe('PATCH /:postId/applications/:applicationId', () => {
    it('승인하면 확정 인원이 늘고 현재/정원을 돌려준다', async () => {
      await apply(A);
      const res = await decide(1, 'ACCEPTED');
      assert.equal(res.status, 200);
      assert.deepEqual((await json(res)).data, { id: 1, status: 'ACCEPTED', current: 2, max: 3, postStatus: 'OPEN' });
    });

    it('거절은 인원을 바꾸지 않는다', async () => {
      await apply(A);
      assert.deepEqual((await json(await decide(1, 'REJECTED'))).data, { id: 1, status: 'REJECTED', current: 1, max: 3, postStatus: 'OPEN' });
    });

    it('정원이 차면 승인은 409 PARTY_FULL, 거절은 가능하다', async () => {
      for (const id of [A, B, C]) await apply(id);
      await decide(1, 'ACCEPTED');
      await decide(2, 'ACCEPTED');
      assert.equal(repo.state.posts.get(1).currentCount, 3);
      assert.equal((await json(await decide(3, 'ACCEPTED'))).error.code, 'PARTY_FULL');
      assert.equal((await decide(3, 'REJECTED')).status, 200);
    });

    it('이미 처리된 신청은 409 ALREADY_DECIDED, 마감된 공고의 승인은 409 POST_CLOSED', async () => {
      await apply(A);
      await apply(B);
      await decide(1, 'ACCEPTED');
      assert.equal((await json(await decide(1, 'REJECTED'))).error.code, 'ALREADY_DECIDED');
      repo.state.posts.get(1).status = 'CLOSED';
      assert.equal((await json(await decide(2, 'ACCEPTED'))).error.code, 'POST_CLOSED');
    });

    it('작성자가 아니면 403, 없는·형식 틀린 신청은 404, status 가 틀리면 400', async () => {
      await apply(A);
      assert.equal((await json(await decide(1, 'ACCEPTED', B))).error.code, 'NOT_POST_AUTHOR');
      for (const id of ['99', 'abc', '0']) assert.equal((await decide(id, 'ACCEPTED')).status, 404, id);
      assert.equal((await decide(1, 'PENDING')).status, 400);
      assert.equal(repo.state.applications[0].status, 'PENDING');
    });
  });

  describe('PATCH /:postId/status', () => {
    const setStatus = (status, memberId = HOST, id = 1) => call('PATCH', `/${id}/status`, { status }, memberId);

    it('작성자가 모집을 마감하고 다시 열 수 있다', async () => {
      assert.deepEqual((await json(await setStatus('CLOSED'))).data, { id: 1, status: 'CLOSED', current: 1, max: 3 });
      assert.equal((await json(await apply(A))).error.code, 'POST_CLOSED');
      assert.deepEqual((await json(await setStatus('OPEN'))).data, { id: 1, status: 'OPEN', current: 1, max: 3 });
      assert.equal((await apply(A)).status, 201);
    });

    it('같은 상태로 바꾸는 요청은 그대로 200 이다', async () => {
      assert.equal((await setStatus('OPEN')).status, 200);
    });

    it('완료 처리하면 되돌릴 수 없다 (409 POST_COMPLETED)', async () => {
      Object.assign(repo.state.posts.get(1), { currentCount: 2, scheduleAt: new Date('2026-11-13T00:00:00Z') });
      assert.equal((await setStatus('COMPLETED')).status, 200);
      for (const status of ['OPEN', 'CLOSED']) {
        const res = await setStatus(status);
        assert.equal(res.status, 409, status);
        assert.equal((await json(res)).error.code, 'POST_COMPLETED');
      }
      assert.equal((await setStatus('COMPLETED')).status, 200);
    });

    it('완료 처리는 파티원이 있고 출발 시간이 지난 뒤에만 가능하다 (일정 미정은 시간 조건 없음)', async () => {
      const post = repo.state.posts.get(1);
      const reject = async (reason) => {
        const res = await setStatus('COMPLETED');
        assert.equal(res.status, 409, reason);
        assert.equal((await json(res)).error.code, 'COMPLETE_NOT_ALLOWED', reason);
        assert.equal(post.status, 'OPEN', reason);
      };
      await reject('파티원 없음(혼자)');
      post.currentCount = 2; // 출발은 NOW 보다 12시간 뒤
      await reject('출발 전');
      post.scheduleAt = null;
      assert.equal((await setStatus('COMPLETED')).status, 200);
    });

    it('정원이 찬 공고는 다시 열 수 없다 (409 PARTY_FULL)', async () => {
      repo.state.posts.get(1).currentCount = 3;
      repo.state.posts.get(1).status = 'CLOSED';
      assert.equal((await json(await setStatus('OPEN'))).error.code, 'PARTY_FULL');
    });

    it('작성자가 아니면 403, 상태값이 틀리면 400, 없는 공고는 404, 비로그인은 401', async () => {
      assert.equal((await json(await setStatus('CLOSED', A))).error.code, 'NOT_POST_AUTHOR');
      assert.equal((await setStatus('DELETED')).status, 400);
      assert.equal((await setStatus('closed')).status, 400);
      assert.equal((await setStatus('CLOSED', HOST, 999)).status, 404);
      assert.equal((await call('PATCH', '/1/status', { status: 'CLOSED' })).status, 401);
      assert.equal(repo.state.posts.get(1).status, 'OPEN');
    });
  });

  describe('모집 인원에 따른 자동 마감', () => {
    it('마지막 자리를 승인하면 공고가 마감되고, 수락된 사람이 취소하면 다시 모집 중이 된다', async () => {
      await apply(A);
      await apply(B);
      await decide(1, 'ACCEPTED');
      const last = await json(await decide(2, 'ACCEPTED'));
      assert.deepEqual(last.data, { id: 2, status: 'ACCEPTED', current: 3, max: 3, postStatus: 'CLOSED' });
      assert.equal(repo.state.posts.get(1).status, 'CLOSED');

      await call('DELETE', '/1/applications/me', undefined, B);
      assert.deepEqual([repo.state.posts.get(1).status, repo.state.posts.get(1).currentCount], ['OPEN', 2]);
      assert.equal((await apply(C)).status, 201);
    });

    it('작성자가 직접 마감한 공고는 자리가 나도 그대로 마감이다', async () => {
      await apply(A);
      await decide(1, 'ACCEPTED');
      repo.state.posts.get(1).status = 'CLOSED';
      await call('DELETE', '/1/applications/me', undefined, A);
      assert.equal(repo.state.posts.get(1).status, 'CLOSED');
    });
  });

  describe('알림 전송 (#38)', () => {
    const sent = () => repo.state.notifications.map((n) => [n.memberId, n.type, n.message]);

    it('신청하면 파티장에게, 다시 신청해도 파티장에게 알린다', async () => {
      await apply(A);
      await call('DELETE', '/1/applications/me', undefined, A); // 대기 중 취소는 알리지 않음
      await apply(A);
      assert.deepEqual(sent(), [
        [HOST, 'APPLICATION_RECEIVED', "회원2님이 '카멘 하드 숙련팟' 공고에 참가를 신청했습니다."],
        [HOST, 'APPLICATION_RECEIVED', "회원2님이 '카멘 하드 숙련팟' 공고에 참가를 신청했습니다."],
      ]);
    });

    it('승인·거절 결과를 신청자에게 알린다', async () => {
      await apply(A);
      await apply(B);
      repo.state.notifications.length = 0;
      await decide(1, 'ACCEPTED');
      await decide(2, 'REJECTED');
      assert.deepEqual(sent(), [
        [A, 'APPLICATION_RESULT', "'카멘 하드 숙련팟' 공고 참가 신청이 수락되었습니다."],
        [B, 'APPLICATION_RESULT', "'카멘 하드 숙련팟' 공고 참가 신청이 거절되었습니다."],
      ]);
    });

    it('수락된 파티원이 취소하면 파티장에게 알리고, 처리 실패한 요청은 알리지 않는다', async () => {
      await apply(A);
      await decide(1, 'ACCEPTED');
      repo.state.notifications.length = 0;
      await decide(1, 'REJECTED'); // 409 ALREADY_DECIDED
      await call('DELETE', '/1/applications/me', undefined, A);
      assert.deepEqual(sent(), [[HOST, 'APPLICATION_CANCELED', "회원2님이 '카멘 하드 숙련팟' 파티 참가를 취소했습니다."]]);
    });

    it('마지막 자리가 차서 자동 마감되면 대기 중인 신청자에게 마감을 알린다', async () => {
      for (const id of [A, B, C]) await apply(id);
      repo.state.posts.get(1).currentCount = 2;
      repo.state.notifications.length = 0;
      await decide(1, 'ACCEPTED'); // 3/3 → 자동 마감
      assert.deepEqual(sent(), [
        [A, 'APPLICATION_RESULT', "'카멘 하드 숙련팟' 공고 참가 신청이 수락되었습니다."],
        [B, 'POST_UPDATED', "'카멘 하드 숙련팟' 공고의 모집이 마감되었습니다."],
        [C, 'POST_UPDATED', "'카멘 하드 숙련팟' 공고의 모집이 마감되었습니다."],
      ]);
    });

    it('작성자가 마감·완료하면 대기 중·수락된 신청자에게 알리고, 재개는 알리지 않는다', async () => {
      await apply(A);
      await apply(B);
      await decide(1, 'ACCEPTED');
      repo.state.notifications.length = 0;
      await call('PATCH', '/1/status', { status: 'CLOSED' }, HOST);
      await call('PATCH', '/1/status', { status: 'OPEN' }, HOST);
      repo.state.posts.get(1).scheduleAt = new Date('2026-11-13T00:00:00Z');
      await call('PATCH', '/1/status', { status: 'COMPLETED' }, HOST);
      assert.deepEqual(sent(), [
        [A, 'POST_UPDATED', "'카멘 하드 숙련팟' 공고의 모집이 마감되었습니다."],
        [B, 'POST_UPDATED', "'카멘 하드 숙련팟' 공고의 모집이 마감되었습니다."],
        [A, 'POST_UPDATED', "'카멘 하드 숙련팟' 파티가 완료 처리되었습니다."],
        [B, 'POST_UPDATED', "'카멘 하드 숙련팟' 파티가 완료 처리되었습니다."],
      ]);
    });

    it('긴 공고 제목은 40자에서 줄임표로 자른다', async () => {
      repo.state.posts.get(1).title = '가'.repeat(60);
      await apply(A);
      assert.equal(repo.state.notifications[0].message, `회원2님이 '${'가'.repeat(40)}…' 공고에 참가를 신청했습니다.`);
    });
  });

  describe('GET /:postId/participants', () => {
    it('비로그인도 볼 수 있고 파티장이 먼저, 이어서 수락된 파티원이 나온다', async () => {
      await apply(A, { role: '딜러' });
      await apply(B);
      await decide(1, 'ACCEPTED');
      const res = await call('GET', '/1/participants');
      assert.equal(res.status, 200);
      const { data } = await json(res);
      assert.deepEqual(data.map((p) => [p.id, p.isHost, p.role]), [[HOST, true, null], [A, false, '딜러']]);
    });

    it('없는 공고는 404', async () => {
      assert.equal((await call('GET', '/999/participants')).status, 404);
    });
  });
});
