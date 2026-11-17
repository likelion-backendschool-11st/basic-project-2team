'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../../src/app');
const { createTokenProvider } = require('../../src/common/tokenProvider');
const { createRecordingEvents } = require('../helpers/recordingEvents');

const AUTH = Object.freeze({ jwtSecret: 'test-secret', accessTokenTtlSeconds: 1800, refreshTokenTtlDays: 1, rememberMeTtlDays: 14 });
const NOW = new Date('2026-11-14T00:00:00Z');
const HOST = 1;
const A = 2;
const B = 3;
const C = 4;

/** DB 대신 메모리에 저장하는 가짜 repository. 승인·취소의 인원 계산은 실제 repository 와 같은 규칙입니다. */
function createFakeRepository() {
  const state = { posts: new Map(), members: new Map(), applications: [], notifications: [], topTags: new Map(), blocks: new Set(), nextId: 1 };
  const notify = (memberId, type, message) => state.notifications.push({ memberId, type, message });
  const dropInvites = (postId, memberId) => {
    state.notifications = state.notifications.filter((n) => !(n.memberId === memberId && n.type === 'PARTY_INVITE' && n.postId === postId));
  };
  const find = (postId, memberId) => state.applications.find((a) => a.postId === postId && a.applicantId === memberId);
  const memberRow = (id) => ({ memberId: id, nickname: `회원${id}`, avatarUrl: null, level: 1, mannerTemp: '36.5', reviewCount: 0, memberStatus: state.members.get(id)?.status ?? 'ACTIVE' });
  return {
    state,
    async findPost(postId) {
      const p = state.posts.get(postId);
      return p && p.status !== 'DELETED' ? { id: postId, ...p } : null;
    },
    async isBlockedBy(blockerId, memberId) {
      return state.blocks.has(`${blockerId}:${memberId}`);
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
      if (!['CANCELED', 'KICKED'].includes(a.status)) return false;
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
      dropInvites(postId, applicantId);
      return true;
    },
    async kickParticipant({ postId, applicantId, notice }) {
      const a = find(postId, applicantId);
      if (!a || a.status !== 'ACCEPTED') return false;
      const post = state.posts.get(postId);
      if (post.status === 'CLOSED' && post.currentCount >= post.headcount) post.status = 'OPEN';
      post.currentCount -= 1;
      a.status = 'KICKED';
      notify(notice.memberId, notice.type, notice.message);
      dropInvites(postId, applicantId);
      return true;
    },
    async findApplications(postId, status) {
      return state.applications
        .filter((a) => a.postId === postId && ['PENDING', 'ACCEPTED', 'REJECTED'].includes(a.status) && (!status || a.status === status))
        .map((a) => ({ ...a, appliedAt: NOW, ...memberRow(a.applicantId) }));
    },
    async findTopTagsByMembers(memberIds, limit) {
      return new Map(memberIds.filter((id) => state.topTags.has(id)).map((id) => [id, state.topTags.get(id).slice(0, limit)]));
    },
    async decideApplication({ postId, applicationId, status, notices }) {
      const post = state.posts.get(postId);
      const a = state.applications.find((x) => x.id === applicationId && x.postId === postId);
      if (!a) return { result: 'NOT_FOUND' };
      if (a.status !== 'PENDING') return { result: 'ALREADY_DECIDED' };
      if (status === 'ACCEPTED') {
        if (post.currentCount >= post.headcount) return { result: 'FULL' };
        if (post.status !== 'OPEN' && post.status !== 'PAUSED') return { result: 'POST_CLOSED' };
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
      if (status === 'PAUSED' && post.status !== 'OPEN') return { result: 'NOT_PAUSABLE' };
      if (status === 'COMPLETED') {
        if (post.currentCount <= 1) return { result: 'NO_MEMBERS' };
      }
      post.status = status;
      if (notice) {
        state.applications.filter((x) => x.postId === postId && ['PENDING', 'ACCEPTED'].includes(x.status)).forEach((x) => notify(x.applicantId, 'POST_UPDATED', notice));
      }
      return out();
    },
    async hasInvitation(postId, memberId) {
      return state.notifications.some((n) => n.memberId === memberId && n.type === 'PARTY_INVITE' && n.postId === postId);
    },
    async createInvitation({ postId, memberId, message }) {
      dropInvites(postId, memberId);
      state.notifications.push({ memberId, type: 'PARTY_INVITE', message, postId });
    },
    async acceptInvitation({ postId, memberId, notices }) {
      const post = state.posts.get(postId);
      const out = (result) => ({ result, current: post.currentCount, max: post.headcount, postStatus: post.status });
      const a = find(postId, memberId);
      const removeInvitation = () => dropInvites(postId, memberId);
      if (a?.status === 'ACCEPTED') {
        removeInvitation();
        return out('ALREADY_MEMBER');
      }
      if (!['OPEN', 'PAUSED'].includes(post.status)) return out('POST_CLOSED');
      if (post.currentCount >= post.headcount) return out('FULL');
      if (a) a.status = 'ACCEPTED';
      else state.applications.push({ id: state.nextId++, postId, applicantId: memberId, role: null, message: null, status: 'ACCEPTED', lateCancel: false });
      post.currentCount += 1;
      removeInvitation();
      notify(post.authorId, 'INVITE_ACCEPTED', notices.accepted);
      if (post.currentCount >= post.headcount) {
        post.status = 'CLOSED';
        state.applications.filter((x) => x.postId === postId && x.status === 'PENDING').forEach((x) => notify(x.applicantId, 'POST_UPDATED', notices.closed));
      }
      return out('OK');
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
  const events = createRecordingEvents();
  const memberEvents = createRecordingEvents();
  const tokens = createTokenProvider(AUTH);

  before(async () => {
    const app = createApp({ partyRepository: repo, postEvents: events, memberEvents, corsOrigins: [], bcryptRounds: 4, auth: AUTH, now: () => NOW });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://localhost:${server.address().port}`;
  });
  after(() => server.close());
  beforeEach(() => {
    events.log.length = 0;
    memberEvents.log.length = 0;
    Object.assign(repo.state, { applications: [], notifications: [], nextId: 1 });
    repo.state.topTags.clear();
    repo.state.blocks.clear();
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
    it('공고 작성자에게 차단당한 회원이면 404 POST_NOT_FOUND 이고 신청이 남지 않는다', async () => {
      repo.state.blocks.add(`${HOST}:${A}`);
      const res = await apply(A);
      assert.equal(res.status, 404);
      assert.equal((await json(res)).error.code, 'POST_NOT_FOUND');
      assert.equal(repo.state.applications.length, 0);
      assert.equal(repo.state.notifications.length, 0);
      assert.equal((await apply(B)).status, 201);
    });

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

    it('일시 중단된 공고는 409 POST_PAUSED', async () => {
      repo.state.posts.get(1).status = 'PAUSED';
      assert.equal((await apply(A)).status, 409);
      assert.equal((await json(await apply(A))).error.code, 'POST_PAUSED');
      assert.equal(repo.state.applications.length, 0);
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
      assert.deepEqual(data[0].applicant, { id: A, nickname: '회원2', avatarUrl: null, level: 1, mannerTemp: 36.5, reviewCount: 0, topTags: [] });
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

    it('신청자마다 많이 받은 평가 태그를 최대 3개 돌려주고, 탈퇴한 신청자는 비운다', async () => {
      const tag = (code, count) => ({ code, label: `#${code}`, count });
      repo.state.topTags.set(A, [tag('kind', 5), tag('punctual', 3), tag('order', 2), tag('fun', 1)]);
      repo.state.topTags.set(B, [tag('kind', 1)]);
      await apply(A);
      await apply(B);
      let { data } = await json(await call('GET', '/1/applications', undefined, HOST));
      assert.deepEqual(data[0].applicant.topTags.map((t) => t.code), ['kind', 'punctual', 'order']);
      assert.deepEqual(data[1].applicant.topTags, [tag('kind', 1)]);

      repo.state.members.set(B, { status: 'WITHDRAWN' });
      ({ data } = await json(await call('GET', '/1/applications', undefined, HOST)));
      assert.deepEqual(data[1].applicant.topTags, []);
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

    it('일시 중단 중에도 이미 받은 신청은 승인할 수 있고, 마지막 자리를 채우면 마감된다', async () => {
      await apply(A);
      repo.state.posts.get(1).status = 'PAUSED';
      assert.equal((await decide(1, 'ACCEPTED')).status, 200);
      assert.equal(repo.state.posts.get(1).status, 'PAUSED');
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

    it('모집 중인 공고를 일시 중단했다가 재개할 수 있고, 마감 공고는 중단할 수 없다 (409 POST_NOT_PAUSABLE)', async () => {
      assert.deepEqual((await json(await setStatus('PAUSED'))).data, { id: 1, status: 'PAUSED', current: 1, max: 3 });
      assert.equal((await json(await apply(A))).error.code, 'POST_PAUSED');
      assert.deepEqual((await json(await setStatus('OPEN'))).data, { id: 1, status: 'OPEN', current: 1, max: 3 });
      assert.equal((await apply(A)).status, 201);
      await setStatus('CLOSED');
      const res = await setStatus('PAUSED');
      assert.equal(res.status, 409);
      assert.equal((await json(res)).error.code, 'POST_NOT_PAUSABLE');
      assert.equal(repo.state.posts.get(1).status, 'CLOSED');
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

    it('완료 처리는 파티원이 있어야 가능하고 출발 시간과는 무관하다', async () => {
      const post = repo.state.posts.get(1);
      const reject = async (reason) => {
        const res = await setStatus('COMPLETED');
        assert.equal(res.status, 409, reason);
        assert.equal((await json(res)).error.code, 'COMPLETE_NOT_ALLOWED', reason);
        assert.equal(post.status, 'OPEN', reason);
      };
      await reject('파티원 없음(혼자)');
      post.currentCount = 2; // 출발은 NOW 보다 12시간 뒤여도 완료 가능
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

  describe('실시간 신호 (SSE)', () => {
    it('신청 · 승인 · 취소 · 모집 상태 변경이 성공하면 그 공고에 post 신호를 보낸다', async () => {
      await apply(A);
      await decide(1, 'ACCEPTED');
      await call('DELETE', '/1/applications/me', undefined, A);
      await call('PATCH', '/1/status', { status: 'CLOSED' }, HOST);
      assert.deepEqual(events.log, [[1, 'post'], [1, 'post'], [1, 'post'], [1, 'post']]);
    });

    it('취소했던 신청을 되살려 다시 신청해도 신호를 보낸다', async () => {
      await apply(A);
      await call('DELETE', '/1/applications/me', undefined, A);
      events.log.length = 0;
      assert.equal((await apply(A)).status, 201);
      assert.deepEqual(events.log, [[1, 'post']]);
    });

    it('실패한 요청(중복 신청 · 권한 없음 · 잘못된 상태)은 신호를 보내지 않는다', async () => {
      await apply(A);
      events.log.length = 0;
      assert.equal((await apply(A)).status, 409);
      assert.equal((await decide(1, 'ACCEPTED', B)).status, 403);
      assert.equal((await call('PATCH', '/1/status', { status: 'DELETED' }, HOST)).status, 400);
      assert.equal((await call('DELETE', '/1/applications/me', undefined, C)).status, 404);
      assert.deepEqual(events.log, []);
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

  describe('파티 초대 (POST /:postId/invitations · /invitations/accept)', () => {
    const invite = (memberId, by = HOST) => call('POST', '/1/invitations', { memberId }, by);
    const accept = (memberId) => call('POST', '/1/invitations/accept', undefined, memberId);
    const invites = () => repo.state.notifications.filter((n) => n.type === 'PARTY_INVITE');

    it('공대장이 초대하면 201 이고 초대받은 회원에게 PARTY_INVITE 알림과 실시간 신호가 간다', async () => {
      const res = await invite(A);
      assert.deepEqual(memberEvents.log, [[A, 'notifications']]);
      assert.equal(res.status, 201);
      assert.deepEqual((await json(res)).data, { postId: 1, memberId: A });
      assert.deepEqual(invites(), [{ memberId: A, type: 'PARTY_INVITE', message: "회원1님이 '카멘 하드 숙련팟' 파티에 초대했습니다.", postId: 1 }]);
    });

    it('공대장이 차단한 회원은 409 INVITEE_BLOCKED 로 초대할 수 없다', async () => {
      repo.state.blocks.add(`${HOST}:${A}`);
      const res = await invite(A);
      assert.equal(res.status, 409);
      assert.equal((await json(res)).error.code, 'INVITEE_BLOCKED');
      assert.deepEqual(invites(), []);
    });

    it('초대받은 뒤 공대장에게 차단당하면 수락은 404 POST_NOT_FOUND', async () => {
      await invite(A);
      repo.state.blocks.add(`${HOST}:${A}`);
      const res = await accept(A);
      assert.equal(res.status, 404);
      assert.equal((await json(res)).error.code, 'POST_NOT_FOUND');
      assert.equal(repo.state.posts.get(1).currentCount, 1);
    });

    it('공대장이 아니면 403, 본인 초대는 403, memberId 가 잘못되면 400, 로그인 안 하면 401', async () => {
      assert.equal((await json(await invite(B, A))).error.code, 'NOT_POST_AUTHOR');
      assert.equal((await json(await invite(HOST))).error.code, 'CANNOT_INVITE_SELF');
      assert.equal((await call('POST', '/1/invitations', { memberId: '2' }, HOST)).status, 400);
      assert.equal((await call('POST', '/1/invitations', { memberId: A })).status, 401);
      assert.equal(invites().length, 0);
    });

    it('이미 파티원·이미 초대함·정지/탈퇴 회원·마감·정원 참은 거절한다', async () => {
      await invite(A);
      assert.equal((await json(await invite(A))).error.code, 'ALREADY_INVITED');
      await accept(A);
      repo.state.notifications.length = 0;
      assert.equal((await json(await invite(A))).error.code, 'ALREADY_MEMBER');
      repo.state.members.set(B, { status: 'BANNED' });
      assert.equal((await json(await invite(B))).error.code, 'INVITEE_UNAVAILABLE');
      repo.state.members.set(B, { status: 'WITHDRAWN' });
      assert.equal((await invite(B)).status, 404);
      repo.state.posts.get(1).status = 'CLOSED';
      assert.equal((await json(await invite(C))).error.code, 'POST_CLOSED');
      repo.state.posts.get(1).status = 'OPEN';
      repo.state.posts.get(1).currentCount = 3;
      assert.equal((await json(await invite(C))).error.code, 'PARTY_FULL');
    });

    it('초대를 수락하면 바로 ACCEPTED 파티원이 되고 인원이 늘며 공대장에게 알리고 초대 알림은 지운다', async () => {
      await invite(A);
      const res = await accept(A);
      assert.equal(res.status, 200);
      assert.deepEqual((await json(res)).data, { postId: 1, status: 'ACCEPTED', current: 2, max: 3, postStatus: 'OPEN', alreadyMember: false });
      assert.equal(repo.state.applications.find((a) => a.applicantId === A).status, 'ACCEPTED');
      assert.deepEqual(repo.state.notifications.at(-1), { memberId: HOST, type: 'INVITE_ACCEPTED', message: "회원2님이 '카멘 하드 숙련팟' 파티 초대를 수락해 파티원이 되었습니다." });
      assert.ok(events.log.length > 0);
      assert.equal(invites().length, 0);
      // 공대장(초대 수락 알림)과 수락한 회원(초대 알림 삭제)의 배지를 바로 갱신한다
      assert.deepEqual(memberEvents.log.slice(-2), [[HOST, 'notifications'], [A, 'notifications']]);
    });

    it('수락한 초대는 지워져 다시 누르면 404, 대기 중에 승인돼 이미 파티원이면 200 (alreadyMember: true) 이고 알림만 지운다', async () => {
      await invite(A);
      await accept(A);
      assert.equal((await json(await accept(A))).error.code, 'INVITATION_NOT_FOUND');
      await apply(B);
      await invite(B);
      await decide(repo.state.applications.find((a) => a.applicantId === B).id, 'ACCEPTED');
      const again = (await json(await accept(B))).data;
      assert.deepEqual([again.alreadyMember, again.current], [true, 3]);
      assert.equal(invites().length, 0);
    });

    it('초대로 들어왔다가 파티를 나간 회원은 다시 초대·수락할 수 있다', async () => {
      await invite(A);
      await accept(A);
      assert.equal((await call('DELETE', '/1/applications/me', undefined, A)).status, 204);
      assert.equal((await invite(A)).status, 201);
      assert.equal(invites().length, 1);
      const again = (await json(await accept(A))).data;
      assert.deepEqual([again.alreadyMember, again.current], [false, 2]);
      assert.equal(repo.state.applications.length, 1);
    });

    it('파티를 나가면 남아 있던 초대는 지워지고, 옛 초대가 남아 있어도 나간 회원은 새로 초대된다', async () => {
      await apply(A);
      await invite(A);
      await decide(repo.state.applications[0].id, 'ACCEPTED');
      await call('DELETE', '/1/applications/me', undefined, A);
      assert.equal(invites().length, 0);
      assert.equal((await json(await accept(A))).error.code, 'INVITATION_NOT_FOUND');
      repo.state.notifications.push({ memberId: A, type: 'PARTY_INVITE', message: '옛 초대', postId: 1 });
      assert.equal((await invite(A)).status, 201);
      assert.deepEqual(invites().map((n) => n.message), ["회원1님이 '카멘 하드 숙련팟' 파티에 초대했습니다."]);
    });

    it('대기·거절·취소 이력이 있어도 같은 행을 ACCEPTED 로 바꾼다', async () => {
      await apply(A);
      repo.state.applications[0].status = 'REJECTED';
      await invite(A);
      assert.equal((await accept(A)).status, 200);
      assert.deepEqual([repo.state.applications.length, repo.state.applications[0].status], [1, 'ACCEPTED']);
    });

    it('초대가 없으면 404 INVITATION_NOT_FOUND, 정원이 차면 409 PARTY_FULL, 마지막 자리면 마감하고 대기자에게 알린다', async () => {
      assert.equal((await json(await accept(A))).error.code, 'INVITATION_NOT_FOUND');
      await apply(C);
      await invite(A);
      await invite(B);
      await accept(A);
      const last = (await json(await accept(B))).data;
      assert.deepEqual([last.current, last.postStatus], [3, 'CLOSED']);
      assert.ok(repo.state.notifications.some((n) => n.memberId === C && n.type === 'POST_UPDATED'));
      repo.state.posts.get(1).status = 'PAUSED';
      repo.state.notifications.push({ memberId: C, type: 'PARTY_INVITE', postId: 1 });
      assert.equal((await json(await accept(C))).error.code, 'PARTY_FULL');
    });
  });

  describe('DELETE /:postId/participants/:memberId', () => {
    const kick = (memberId, by = HOST, body = undefined) => call('DELETE', `/1/participants/${memberId}`, body, by);

    it('파티장이 수락된 파티원을 내보내면 204, 신청은 KICKED · 인원 감소 · 본인에게 알림', async () => {
      await apply(A);
      await decide(1, 'ACCEPTED');
      repo.state.notifications.length = 0;
      events.log.length = 0;
      const res = await kick(A);
      assert.equal(res.status, 204);
      assert.equal(repo.state.applications[0].status, 'KICKED');
      assert.equal(repo.state.applications[0].lateCancel, false);
      assert.equal(repo.state.posts.get(1).currentCount, 1);
      assert.deepEqual(repo.state.notifications, [{ memberId: A, type: 'PARTY_KICKED', message: "'카멘 하드 숙련팟' 파티에서 파티장에 의해 추방되었습니다." }]);
      assert.equal(events.log.length, 1);
      const { data } = await json(await call('GET', '/1/participants'));
      assert.deepEqual(data.map((p) => p.id), [HOST]);
    });

    it('추방된 회원에게 실시간 신호가 가고, 남아 있던 초대는 지워져 승인 없이 다시 들어올 수 없다', async () => {
      await apply(A);
      await decide(1, 'ACCEPTED');
      repo.state.notifications.push({ memberId: A, type: 'PARTY_INVITE', message: '옛 초대', postId: 1 });
      memberEvents.log.length = 0;
      assert.equal((await kick(A)).status, 204);
      assert.deepEqual(memberEvents.log, [[A, 'notifications']]);
      assert.equal(repo.state.notifications.some((n) => n.type === 'PARTY_INVITE'), false);
      const res = await call('POST', '/1/invitations/accept', undefined, A);
      assert.equal(res.status, 404);
      assert.equal((await json(res)).error.code, 'INVITATION_NOT_FOUND');
      assert.equal(repo.state.applications[0].status, 'KICKED');
    });

    it('정원이 차서 자동 마감된 공고는 추방하면 다시 모집 중이 되고, 추방된 회원은 다시 신청할 수 있다', async () => {
      repo.state.posts.get(1).headcount = 2;
      await apply(A);
      await decide(1, 'ACCEPTED');
      assert.equal(repo.state.posts.get(1).status, 'CLOSED');
      await kick(A);
      assert.equal(repo.state.posts.get(1).status, 'OPEN');
      assert.equal((await apply(A)).status, 201);
    });

    it('추방 사유를 주면 알림 둘째 줄에 붙이고(줄바꿈은 띄어쓰기로), 100자를 넘으면 400', async () => {
      await apply(A);
      await decide(1, 'ACCEPTED');
      const tooLong = await kick(A, HOST, { reason: '가'.repeat(101) });
      assert.equal(tooLong.status, 400);
      assert.equal((await json(tooLong)).error.fields[0].field, 'reason');
      repo.state.notifications.length = 0;
      assert.equal((await kick(A, HOST, { reason: ' 사전 고지 없는\n지각 ' })).status, 204);
      assert.equal(repo.state.notifications[0].message, "'카멘 하드 숙련팟' 파티에서 파티장에 의해 추방되었습니다.\n사유: 사전 고지 없는 지각");
    });

    it('작성자가 아니면 403 NOT_POST_AUTHOR', async () => {
      await apply(A);
      await decide(1, 'ACCEPTED');
      const res = await kick(A, B);
      assert.equal(res.status, 403);
      assert.equal((await json(res)).error.code, 'NOT_POST_AUTHOR');
    });

    it('파티장 본인은 400 CANNOT_KICK_HOST', async () => {
      const res = await kick(HOST);
      assert.equal(res.status, 400);
      assert.equal((await json(res)).error.code, 'CANNOT_KICK_HOST');
    });

    it('수락되지 않은(대기 중·없는) 회원은 404 PARTICIPANT_NOT_FOUND', async () => {
      await apply(A);
      for (const target of [A, C, 'abc']) {
        const res = await kick(target);
        assert.equal(res.status, 404, String(target));
        assert.equal((await json(res)).error.code, 'PARTICIPANT_NOT_FOUND');
      }
      assert.equal(repo.state.applications[0].status, 'PENDING');
    });

    it('완료된 파티는 409 POST_COMPLETED, 비로그인은 401', async () => {
      await apply(A);
      await decide(1, 'ACCEPTED');
      assert.equal((await call('DELETE', `/1/participants/${A}`)).status, 401);
      repo.state.posts.get(1).status = 'COMPLETED';
      const res = await kick(A);
      assert.equal(res.status, 409);
      assert.equal((await json(res)).error.code, 'POST_COMPLETED');
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
