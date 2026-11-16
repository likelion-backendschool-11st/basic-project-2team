'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../../src/app');
const { createTokenProvider } = require('../../src/common/tokenProvider');
const { createRecordingEvents } = require('../helpers/recordingEvents');

const AUTH = Object.freeze({
  jwtSecret: 'test-secret',
  accessTokenTtlSeconds: 1800,
  refreshTokenTtlDays: 1,
  rememberMeTtlDays: 14,
});
const POST_ID = 1;
const HOST = 7;
const ALICE = 9;
const BOB = 10;
const OUTSIDER = 11;
const START = new Date('2026-11-16T10:00:00Z');
const inMinutes = (minutes) => new Date(clock.now.getTime() + minutes * 60000).toISOString();
const clock = { now: START };

/** DB 대신 메모리에 저장하는 가짜 repository */
function createFakeRepository() {
  const state = {};
  const reset = () =>
    Object.assign(state, {
      posts: new Map([[POST_ID, { id: POST_ID, authorId: HOST, title: '카멘 하드 숙련팟', headcount: 8, currentCount: 3, deleted: false }]]),
      members: new Map([
        [HOST, { nickname: '빛나는오더', mannerTemp: '99.8', status: 'ACTIVE' }],
        [ALICE, { nickname: '앨리스', mannerTemp: '36.5', status: 'ACTIVE' }],
        [BOB, { nickname: '밥', mannerTemp: '40.0', status: 'ACTIVE' }],
        [OUTSIDER, { nickname: '구경꾼', mannerTemp: '36.5', status: 'ACTIVE' }],
      ]),
      accepted: [ALICE, BOB],
      commenters: new Set(),
      polls: [],
      options: [],
      votes: [],
      comments: [],
      notifications: [],
    });
  reset();
  const pollRow = (p) => ({ ...p });
  const alivePost = (postId) => {
    const post = state.posts.get(postId);
    return post && !post.deleted ? post : null;
  };

  return {
    state,
    reset,
    async findPost(postId) {
      const post = alivePost(postId);
      return post ? { id: post.id, authorId: post.authorId, title: post.title, headcount: post.headcount, currentCount: post.currentCount } : null;
    },
    async findLatestPoll(postId) {
      const polls = state.polls.filter((p) => p.postId === postId);
      return polls.length ? pollRow(polls[polls.length - 1]) : null;
    },
    async findPollById(pollId) {
      const poll = state.polls.find((p) => p.id === pollId);
      return poll && alivePost(poll.postId) ? pollRow(poll) : null;
    },
    async findOptions(pollId) {
      return state.options.filter((o) => o.pollId === pollId).map(({ id, label }) => ({ id, label }));
    },
    async findVotes(pollId) {
      return state.votes
        .filter((v) => v.pollId === pollId)
        .map((v) => {
          const m = state.members.get(v.memberId);
          return { memberId: v.memberId, optionId: v.optionId, votedAt: v.createdAt, nickname: m.nickname, mannerTemp: m.mannerTemp, memberStatus: m.status };
        });
    },
    async findPartyMembers(postId) {
      const post = state.posts.get(postId);
      const row = (id, isHost) => {
        const m = state.members.get(id);
        return { memberId: id, nickname: m.nickname, mannerTemp: m.mannerTemp, memberStatus: m.status, isHost: isHost ? 1 : 0 };
      };
      return [row(post.authorId, true), ...state.accepted.map((id) => row(id, false))];
    },
    async findCommenterIds(postId, memberIds) {
      return new Set(memberIds.filter((id) => state.commenters.has(id)));
    },
    async createPoll({ postId, authorId, title, description, multiple, commentersOnly, pinned, closesAt, options, now }) {
      if (state.polls.some((p) => p.postId === postId && !p.closedAt && new Date(p.closesAt) > now)) return null;
      const id = state.polls.length + 1;
      state.polls.push({
        id, postId, authorId, title, description, isMultiple: multiple ? 1 : 0, commentersOnly: commentersOnly ? 1 : 0,
        isPinned: pinned ? 1 : 0, closesAt, finalOptionId: null, notice: null, closedAt: null, remindedAt: null, createdAt: now,
      });
      for (const label of options) state.options.push({ id: state.options.length + 1, pollId: id, label });
      return id;
    },
    async updatePoll(pollId, { title, description, multiple, commentersOnly, pinned, closesAt, options }) {
      if (state.votes.some((v) => v.pollId === pollId)) return false;
      Object.assign(state.polls.find((p) => p.id === pollId), {
        title, description, isMultiple: multiple ? 1 : 0, commentersOnly: commentersOnly ? 1 : 0, isPinned: pinned ? 1 : 0, closesAt,
      });
      state.options = state.options.filter((o) => o.pollId !== pollId);
      for (const label of options) state.options.push({ id: state.options.length + 100, pollId, label });
      return true;
    },
    async replaceVotes({ pollId, memberId, optionIds }) {
      if (state.polls.find((p) => p.id === pollId).closedAt) return false;
      state.votes = state.votes.filter((v) => !(v.pollId === pollId && v.memberId === memberId));
      for (const optionId of optionIds) state.votes.push({ pollId, optionId, memberId, createdAt: clock.now });
      return true;
    },
    async updatePinned(pollId, pinned) {
      state.polls.find((p) => p.id === pollId).isPinned = pinned ? 1 : 0;
    },
    async confirmPoll({ pollId, finalOptionId, notice, pinned, closedAt, comment, notifications }) {
      const poll = state.polls.find((p) => p.id === pollId);
      if (poll.closedAt) return false;
      Object.assign(poll, { finalOptionId, notice, closedAt, isPinned: pinned === null ? poll.isPinned : pinned ? 1 : 0 });
      if (comment) state.comments.push(comment);
      state.notifications.push(...notifications);
      return true;
    },
    async remind({ pollId, remindedAt, remindableBefore, notifications }) {
      const poll = state.polls.find((p) => p.id === pollId);
      if (poll.remindedAt && poll.remindedAt > remindableBefore) return false;
      poll.remindedAt = remindedAt;
      state.notifications.push(...notifications);
      return true;
    },
  };
}

describe('파티 의견 조율 투표 API', () => {
  let server;
  let baseUrl;
  const repo = createFakeRepository();
  const events = createRecordingEvents();
  const tokens = createTokenProvider(AUTH);

  before(async () => {
    const app = createApp({ pollRepository: repo, postEvents: events, corsOrigins: [], bcryptRounds: 4, auth: AUTH, now: () => clock.now });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://localhost:${server.address().port}`;
  });
  after(() => server.close());
  beforeEach(() => {
    clock.now = START;
    repo.reset();
    events.log.length = 0;
  });

  const send = async (method, path, body, memberId = HOST) => {
    const headers = { 'content-type': 'application/json' };
    if (memberId !== null) headers.Authorization = `Bearer ${tokens.createAccessToken(memberId)}`;
    const res = await fetch(`${baseUrl}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  };
  const pollBody = (overrides = {}) => ({
    title: '오늘 레이드 출발 시간 언제가 좋으신가요?',
    options: ['오후 8:00 출발 (칼출)', '오후 9:00 출발 (여유출)'],
    closesAt: inMinutes(60),
    ...overrides,
  });
  const create = (overrides, memberId = HOST) => send('POST', `/api/posts/${POST_ID}/poll`, pollBody(overrides), memberId);
  const vote = (pollId, optionIds, memberId) => send('PUT', `/api/polls/${pollId}/votes`, { optionIds }, memberId);

  describe('투표 만들기 (POST /api/posts/:postId/poll)', () => {
    it('공대장이 만들면 201 과 투표를 돌려주고 poll 신호를 보낸다', async () => {
      const { status, body } = await create({ description: '  퇴근 일정 확인 후 투표 부탁드립니다.  ' });
      assert.equal(status, 201);
      const poll = body.data;
      assert.equal(poll.title, '오늘 레이드 출발 시간 언제가 좋으신가요?');
      assert.equal(poll.description, '퇴근 일정 확인 후 투표 부탁드립니다.');
      assert.equal(poll.status, 'OPEN');
      assert.equal(poll.multiple, false);
      assert.equal(poll.pinned, true);
      assert.deepEqual(poll.options.map((o) => [o.label, o.voteCount]), [['오후 8:00 출발 (칼출)', 0], ['오후 9:00 출발 (여유출)', 0]]);
      assert.equal(poll.eligibleCount, 3);
      assert.deepEqual(poll.viewer, { memberId: HOST, isHost: true, isMember: true, canVote: true, votedOptionIds: [] });
      assert.equal(poll.participants.nonVoters.length, 3);
      assert.deepEqual(events.log, [[POST_ID, 'poll']]);
    });

    it('공대장이 아니면 403, 로그인하지 않으면 401', async () => {
      assert.equal((await create({}, ALICE)).body.error.code, 'NOT_POST_AUTHOR');
      assert.equal((await create({}, null)).status, 401);
      assert.equal(repo.state.polls.length, 0);
    });

    it('제목 · 항목 수 · 중복 항목 · 지난 마감 시각은 400 INVALID_INPUT', async () => {
      const { status, body } = await create({ title: ' ', options: ['하나'], closesAt: inMinutes(-1) });
      assert.equal(status, 400);
      assert.deepEqual(body.error.fields.map((f) => f.field), ['title', 'closesAt', 'options']);
      assert.equal((await create({ options: ['같음', '같음'] })).status, 400);
      assert.equal((await create({ options: ['1', '2', '3', '4', '5', '6'] })).status, 400);
      assert.equal((await create({ closesAt: inMinutes(60 * 24 * 31) })).status, 400);
    });

    it('진행 중인 투표가 있으면 409, 마감 시각이 지났으면 새로 만들 수 있다', async () => {
      await create();
      assert.equal((await create()).body.error.code, 'POLL_ALREADY_OPEN');
      clock.now = new Date(START.getTime() + 61 * 60000);
      assert.equal((await create({ closesAt: inMinutes(30) })).status, 201);
    });

    it('없는 공고는 404 POST_NOT_FOUND', async () => {
      assert.equal((await send('POST', '/api/posts/999/poll', pollBody())).body.error.code, 'POST_NOT_FOUND');
    });
  });

  describe('투표 조회 (GET /api/posts/:postId/poll)', () => {
    it('투표가 없으면 data 가 null', async () => {
      const { status, body } = await send('GET', `/api/posts/${POST_ID}/poll`, undefined, null);
      assert.equal(status, 200);
      assert.equal(body.data, null);
    });

    it('비로그인 · 공대원이 아닌 사용자에게는 결과만 보이고 참여자 명단은 null', async () => {
      const { data: poll } = (await create()).body;
      await vote(poll.id, [poll.options[0].id], ALICE);
      const guest = (await send('GET', `/api/posts/${POST_ID}/poll`, undefined, null)).body.data;
      assert.equal(guest.options[0].voteCount, 1);
      assert.equal(guest.viewer, null);
      assert.equal(guest.participants, null);
      const outsider = (await send('GET', `/api/posts/${POST_ID}/poll`, undefined, OUTSIDER)).body.data;
      assert.deepEqual(outsider.viewer, { memberId: OUTSIDER, isHost: false, isMember: false, canVote: false, votedOptionIds: [] });
      assert.equal(outsider.participants, null);
    });

    it('공대원에게는 투표자 · 미투표자 명단을 보여준다', async () => {
      const { data: poll } = (await create()).body;
      await vote(poll.id, [poll.options[1].id], ALICE);
      const { participants } = (await send('GET', `/api/posts/${POST_ID}/poll`, undefined, BOB)).body.data;
      assert.deepEqual(participants.voters, [
        { memberId: ALICE, nickname: '앨리스', mannerTemp: 36.5, isHost: false, optionIds: [poll.options[1].id], votedAt: START.toISOString() },
      ]);
      assert.deepEqual(participants.nonVoters.map((m) => [m.nickname, m.isHost]), [['빛나는오더', true], ['밥', false]]);
    });
  });

  describe('투표하기 (PUT /api/polls/:pollId/votes)', () => {
    it('공대원이 투표하고, 다시 보내면 바꾸고, 빈 배열이면 취소한다', async () => {
      const { data: poll } = (await create()).body;
      const [first, second] = poll.options.map((o) => o.id);
      const voted = await vote(poll.id, [first], ALICE);
      assert.equal(voted.status, 200);
      assert.deepEqual(voted.body.data.viewer.votedOptionIds, [first]);
      assert.equal(voted.body.data.totalVoters, 1);

      const changed = (await vote(poll.id, [second], ALICE)).body.data;
      assert.deepEqual(changed.options.map((o) => o.voteCount), [0, 1]);

      const canceled = (await vote(poll.id, [], ALICE)).body.data;
      assert.equal(canceled.totalVoters, 0);
      assert.deepEqual(events.log.filter(([, topic]) => topic === 'poll').length, 4);
    });

    it('단일 선택에 여러 항목은 400, 복수 선택이면 허용', async () => {
      const { data: single } = (await create()).body;
      const ids = single.options.map((o) => o.id);
      assert.equal((await vote(single.id, ids, ALICE)).body.error.code, 'SINGLE_CHOICE_ONLY');

      clock.now = new Date(START.getTime() + 61 * 60000);
      const { data: multi } = (await create({ multiple: true, closesAt: inMinutes(30) })).body;
      const res = await vote(multi.id, multi.options.map((o) => o.id), ALICE);
      assert.equal(res.status, 200);
      assert.equal(res.body.data.totalVoters, 1);
      assert.deepEqual(res.body.data.options.map((o) => o.voteCount), [1, 1]);
    });

    it('공대원이 아니면 403 NOT_POLL_VOTER, 다른 투표의 항목이면 400', async () => {
      const { data: poll } = (await create()).body;
      assert.equal((await vote(poll.id, [poll.options[0].id], OUTSIDER)).body.error.code, 'NOT_POLL_VOTER');
      assert.equal((await vote(poll.id, [999], ALICE)).body.error.code, 'POLL_OPTION_NOT_FOUND');
      assert.equal((await vote(poll.id, ['x'], ALICE)).status, 400);
    });

    it('댓글 작성자만 허용이면 댓글을 남긴 공대원만 투표할 수 있다 (공대장은 예외)', async () => {
      const { data: poll } = (await create({ commentersOnly: true })).body;
      assert.equal(poll.eligibleCount, 1);
      assert.equal((await vote(poll.id, [poll.options[0].id], ALICE)).body.error.code, 'POLL_COMMENT_REQUIRED');
      repo.state.commenters.add(ALICE);
      assert.equal((await vote(poll.id, [poll.options[0].id], ALICE)).status, 200);
      assert.equal((await vote(poll.id, [poll.options[0].id], HOST)).status, 200);
    });

    it('마감 시각이 지나면 status 가 ENDED 이고 투표는 409 POLL_NOT_OPEN', async () => {
      const { data: poll } = (await create()).body;
      clock.now = new Date(START.getTime() + 61 * 60000);
      assert.equal((await vote(poll.id, [poll.options[0].id], ALICE)).body.error.code, 'POLL_NOT_OPEN');
      const current = (await send('GET', `/api/posts/${POST_ID}/poll`, undefined, ALICE)).body.data;
      assert.equal(current.status, 'ENDED');
      assert.equal(current.viewer.canVote, false);
    });
  });

  describe('투표 편집 · 공지 고정 (PATCH /api/polls/:pollId, /pin)', () => {
    it('아무도 투표하지 않았으면 제목 · 항목을 고친다', async () => {
      const { data: poll } = (await create()).body;
      const { status, body } = await send('PATCH', `/api/polls/${poll.id}`, pollBody({ title: '출발 시간 다시 정해요', options: ['8시', '9시', '10시'] }));
      assert.equal(status, 200);
      assert.equal(body.data.title, '출발 시간 다시 정해요');
      assert.deepEqual(body.data.options.map((o) => o.label), ['8시', '9시', '10시']);
    });

    it('투표가 있으면 409 POLL_HAS_VOTES, 공대장이 아니면 403', async () => {
      const { data: poll } = (await create()).body;
      assert.equal((await send('PATCH', `/api/polls/${poll.id}`, pollBody(), ALICE)).body.error.code, 'NOT_POST_AUTHOR');
      await vote(poll.id, [poll.options[0].id], ALICE);
      assert.equal((await send('PATCH', `/api/polls/${poll.id}`, pollBody())).body.error.code, 'POLL_HAS_VOTES');
    });

    it('공지 고정을 해제하고 다시 고정한다', async () => {
      const { data: poll } = (await create()).body;
      assert.equal((await send('PATCH', `/api/polls/${poll.id}/pin`, { pinned: false })).body.data.pinned, false);
      assert.equal((await send('PATCH', `/api/polls/${poll.id}/pin`, { pinned: true })).body.data.pinned, true);
      assert.equal((await send('PATCH', `/api/polls/${poll.id}/pin`, { pinned: 'no' })).status, 400);
      assert.equal((await send('PATCH', `/api/polls/${poll.id}/pin`, { pinned: false }, ALICE)).status, 403);
    });

    it('없는 투표는 404 POLL_NOT_FOUND', async () => {
      assert.equal((await send('PATCH', '/api/polls/999/pin', { pinned: false })).body.error.code, 'POLL_NOT_FOUND');
      assert.equal((await send('PATCH', '/api/polls/abc/pin', { pinned: false })).status, 404);
    });
  });

  describe('결과 확정 (POST /api/polls/:pollId/close)', () => {
    it('조기 마감하고 확정 항목 · 공지를 저장하며, 안내 댓글과 알림을 함께 보낸다', async () => {
      const { data: poll } = (await create()).body;
      const final = poll.options[0].id;
      await vote(poll.id, [final], ALICE);
      events.log.length = 0;

      const { status, body } = await send('POST', `/api/polls/${poll.id}/close`, {
        finalOptionId: final,
        notice: '오후 8시로 확정! 10분 전까지 디코 대기실로 모여주세요.',
        postComment: true,
        notifyMembers: true,
      });
      assert.equal(status, 200);
      assert.equal(body.data.status, 'CONFIRMED');
      assert.equal(body.data.finalOptionId, final);
      assert.equal(body.data.notice, '오후 8시로 확정! 10분 전까지 디코 대기실로 모여주세요.');
      assert.equal(body.data.confirmedAt, START.toISOString());
      assert.deepEqual(repo.state.comments, [{ postId: POST_ID, authorId: HOST, content: '오후 8시로 확정! 10분 전까지 디코 대기실로 모여주세요.' }]);
      assert.deepEqual(repo.state.notifications.map((n) => [n.memberId, n.type]), [[ALICE, 'POLL_CONFIRMED'], [BOB, 'POLL_CONFIRMED']]);
      assert.deepEqual(events.log, [[POST_ID, 'poll'], [POST_ID, 'comments']]);
    });

    it('공지가 없으면 안내 댓글은 기본 문구로 달고, 옵션을 끄면 댓글 · 알림을 보내지 않는다', async () => {
      const { data: poll } = (await create()).body;
      await send('POST', `/api/polls/${poll.id}/close`, { finalOptionId: poll.options[1].id, postComment: true });
      assert.match(repo.state.comments[0].content, /'오후 9:00 출발 \(여유출\)'\(으\)로 확정/);
      assert.equal(repo.state.notifications.length, 0);
    });

    it('이미 확정했으면 409, 다른 투표의 항목이면 400, 공대장이 아니면 403', async () => {
      const { data: poll } = (await create()).body;
      assert.equal((await send('POST', `/api/polls/${poll.id}/close`, { finalOptionId: poll.options[0].id }, ALICE)).status, 403);
      assert.equal((await send('POST', `/api/polls/${poll.id}/close`, { finalOptionId: 999 })).body.error.code, 'POLL_OPTION_NOT_FOUND');
      assert.equal((await send('POST', `/api/polls/${poll.id}/close`, {})).status, 400);
      await send('POST', `/api/polls/${poll.id}/close`, { finalOptionId: poll.options[0].id });
      assert.equal((await send('POST', `/api/polls/${poll.id}/close`, { finalOptionId: poll.options[0].id })).body.error.code, 'POLL_ALREADY_CONFIRMED');
      assert.equal((await vote(poll.id, [poll.options[0].id], ALICE)).body.error.code, 'POLL_NOT_OPEN');
    });

    it('마감 시각이 지난(ENDED) 투표도 확정할 수 있다', async () => {
      const { data: poll } = (await create()).body;
      clock.now = new Date(START.getTime() + 61 * 60000);
      assert.equal((await send('POST', `/api/polls/${poll.id}/close`, { finalOptionId: poll.options[0].id })).body.data.status, 'CONFIRMED');
    });
  });

  describe('미투표자 알림 (POST /api/polls/:pollId/reminders)', () => {
    it('투표하지 않은 공대원(공대장 제외)에게 알림을 보내고 10분 안에는 다시 보낼 수 없다', async () => {
      const { data: poll } = (await create()).body;
      await vote(poll.id, [poll.options[0].id], ALICE);
      const first = await send('POST', `/api/polls/${poll.id}/reminders`);
      assert.equal(first.status, 200);
      assert.deepEqual(first.body.data, { count: 1 });
      assert.deepEqual(repo.state.notifications.map((n) => [n.memberId, n.type]), [[BOB, 'POLL_REMINDER']]);

      assert.equal((await send('POST', `/api/polls/${poll.id}/reminders`)).body.error.code, 'POLL_REMIND_TOO_SOON');
      clock.now = new Date(START.getTime() + 10 * 60000);
      assert.equal((await send('POST', `/api/polls/${poll.id}/reminders`)).status, 200);
    });

    it('모두 투표했으면 count 0, 공대장이 아니면 403', async () => {
      const { data: poll } = (await create()).body;
      assert.equal((await send('POST', `/api/polls/${poll.id}/reminders`, undefined, ALICE)).status, 403);
      await vote(poll.id, [poll.options[0].id], ALICE);
      await vote(poll.id, [poll.options[0].id], BOB);
      assert.deepEqual((await send('POST', `/api/polls/${poll.id}/reminders`)).body.data, { count: 0 });
    });
  });
});
