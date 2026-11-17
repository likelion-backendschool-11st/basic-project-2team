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
const NOW = new Date('2026-11-13T00:00:00Z');
const POST_ID = 1;
const HOST_ID = 7;
const ALICE = 9;
const BOB = 10;

const members = () =>
  new Map([
    [HOST_ID, { nickname: '빛나는오더', status: 'ACTIVE', suspendedUntil: null }],
    [ALICE, { nickname: '앨리스', status: 'ACTIVE', suspendedUntil: null }],
    [BOB, { nickname: '밥', status: 'ACTIVE', suspendedUntil: null }],
  ]);

/** DB 대신 메모리에 저장하는 가짜 repository */
function createFakeRepository() {
  const state = { posts: new Map(), members: new Map(), comments: [], reports: [], party: [], applications: [], blocks: new Set(), seconds: 0 };
  const alive = (c) => c.status !== 'DELETED';
  const withAuthor = (c) => {
    const m = state.members.get(c.authorId);
    return {
      id: c.id,
      postId: c.postId,
      parentId: c.parentId,
      acceptedReplyId: c.acceptedReplyId ?? null,
      content: c.content,
      isSecret: c.isSecret ? 1 : 0,
      isPartyOnly: c.isPartyOnly ? 1 : 0,
      status: c.status,
      createdAt: c.createdAt,
      authorId: c.authorId,
      authorNickname: m.nickname,
      authorAvatarUrl: null,
      authorStatus: m.status,
    };
  };
  const byTime = (a, b) => a.createdAt - b.createdAt || a.id - b.id;

  return {
    state,
    /** 테스트 준비용: 시간 순서가 보장되도록 1초씩 늘려 댓글을 넣습니다. */
    seed(comment) {
      state.seconds += 1;
      const row = {
        id: state.comments.length + 1,
        parentId: null,
        isSecret: false,
        isPartyOnly: false,
        status: 'VISIBLE',
        reportCount: 0,
        postId: POST_ID,
        createdAt: new Date(NOW.getTime() - 3600000 + state.seconds * 1000),
        ...comment,
      };
      state.comments.push(row);
      const post = state.posts.get(row.postId);
      if (post && !row.isPartyOnly) post.commentCount += 1;
      return row.id;
    },
    async findPost(postId) {
      const post = state.posts.get(postId);
      return post && post.status !== 'DELETED' ? { id: post.id, authorId: post.authorId } : null;
    },
    async isBlockedBy(blockerId, memberId) {
      return state.blocks.has(`${blockerId}:${memberId}`);
    },
    async findMemberStatus(memberId) {
      const m = state.members.get(memberId);
      return m ? { status: m.status, suspendedUntil: m.suspendedUntil } : null;
    },
    async findParentComment(postId, commentId) {
      const c = state.comments.find((x) => x.id === commentId && x.postId === postId && alive(x));
      return c ? { id: c.id, parentId: c.parentId, authorId: c.authorId, isPartyOnly: c.isPartyOnly ? 1 : 0 } : null;
    },
    async findPartyMembers(postId) {
      const post = state.posts.get(postId);
      return [{ memberId: post.authorId, isHost: true, role: null, mannerTemp: 36.5 }, ...state.party];
    },
    async createComment({ postId, authorId, parentId, content, isSecret, isPartyOnly = false }) {
      return this.seed({ postId, authorId, parentId, content, isSecret, isPartyOnly });
    },
    async findCommentById(id) {
      const c = state.comments.find((x) => x.id === id);
      return c ? withAuthor(c) : null;
    },
    async findRootCommentPage({ postId, sort, limit, offset, partyOnly = false }) {
      const channel = state.comments.filter((c) => c.postId === postId && Boolean(c.isPartyOnly) === partyOnly && alive(c));
      const roots = channel.filter((c) => c.parentId === null).sort(byTime);
      if (sort === 'newest') roots.reverse();
      return { rows: roots.slice(offset, offset + limit).map(withAuthor), totalCount: roots.length, commentCount: channel.length };
    },
    async findReplies(parentIds) {
      return state.comments
        .filter((c) => parentIds.includes(c.parentId) && alive(c))
        .sort(byTime)
        .map(withAuthor);
    },
    async findCommentContext(commentId) {
      const c = state.comments.find((x) => x.id === commentId && alive(x));
      const post = c && state.posts.get(c.postId);
      if (!c || !post || post.status === 'DELETED') return null;
      const parent = state.comments.find((x) => x.id === c.parentId);
      return { ...withAuthor(c), postAuthorId: post.authorId, parentAuthorId: parent?.authorId ?? null, parentAcceptedReplyId: parent?.acceptedReplyId ?? null };
    },
    async setAcceptedReply(commentId, replyId) {
      state.comments.find((x) => x.id === commentId).acceptedReplyId = replyId;
    },
    async updateCommentContent(commentId, content) {
      for (const c of state.comments) if (c.acceptedReplyId === commentId) c.acceptedReplyId = null;
      state.comments.find((x) => x.id === commentId).content = content;
    },
    async deleteCommentWithReplies({ commentId, postId, deletedAt, isPartyOnly = false }) {
      const targets = state.comments.filter((c) => (c.id === commentId || c.parentId === commentId) && alive(c));
      for (const c of targets) Object.assign(c, { status: 'DELETED', deletedAt });
      const post = state.posts.get(postId);
      if (!isPartyOnly) post.commentCount = Math.max(0, post.commentCount - targets.length);
      return targets.length;
    },
    async createCommentReport({ reporterId, commentId, targetMemberId, postId, reasonCode, detail }) {
      if (state.reports.some((r) => r.reporterId === reporterId && r.targetType === 'COMMENT' && r.targetId === commentId)) return null;
      state.reports.push({ id: state.reports.length + 1, reporterId, targetType: 'COMMENT', targetId: commentId, targetMemberId, postId, reasonCode, detail });
      const c = state.comments.find((x) => x.id === commentId);
      if (c.status === 'VISIBLE' && c.reportCount + 1 >= 5) c.status = 'HIDDEN';
      c.reportCount += 1;
      return state.reports.length;
    },
    async createMemberReport({ reporterId, targetMemberId, reasonCode, detail }) {
      if (state.reports.some((r) => r.reporterId === reporterId && r.targetType === 'MEMBER' && r.targetId === targetMemberId)) return null;
      state.reports.push({ id: state.reports.length + 1, reporterId, targetType: 'MEMBER', targetId: targetMemberId, targetMemberId, postId: null, reasonCode, detail });
      return state.reports.length;
    },
    async createPostReport({ reporterId, postId, targetMemberId, reasonCode, detail }) {
      if (state.reports.some((r) => r.reporterId === reporterId && r.targetType === 'POST' && r.targetId === postId)) return null;
      state.reports.push({ id: state.reports.length + 1, reporterId, targetType: 'POST', targetId: postId, targetMemberId, postId, reasonCode, detail });
      return state.reports.length;
    },
    async findNoShowTarget(postId, memberId) {
      const post = state.posts.get(postId);
      if (!post || post.status === 'DELETED') return null;
      const a = state.applications.find((x) => x.postId === postId && x.applicantId === memberId);
      return { postId, authorId: post.authorId, status: post.status, scheduleAt: post.scheduleAt ?? null, application: a ? { id: a.id, status: a.status } : null };
    },
    async createNoShowReport({ reporterId, applicationId, targetMemberId, postId, reasonCode, detail }) {
      if (state.reports.some((r) => r.reporterId === reporterId && r.targetType === 'NO_SHOW' && r.targetId === applicationId)) return null;
      state.reports.push({ id: state.reports.length + 1, reporterId, targetType: 'NO_SHOW', targetId: applicationId, targetMemberId, postId, reasonCode, detail });
      return state.reports.length;
    },
    async findReportedCommentIds(memberId, commentIds) {
      return new Set(
        state.reports
          .filter((r) => r.reporterId === memberId && r.targetType === 'COMMENT' && commentIds.includes(r.targetId))
          .map((r) => r.targetId),
      );
    },
  };
}

describe('댓글 API /api/posts/:postId/comments', () => {
  let server;
  let baseUrl;
  const repo = createFakeRepository();
  const events = createRecordingEvents();
  const tokens = createTokenProvider(AUTH);

  before(async () => {
    const app = createApp({ commentRepository: repo, postEvents: events, corsOrigins: [], bcryptRounds: 4, auth: AUTH, now: () => NOW });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://localhost:${server.address().port}`;
  });
  after(() => server.close());
  beforeEach(() => {
    events.log.length = 0;
    repo.state.comments.length = 0;
    repo.state.reports.length = 0;
    repo.state.seconds = 0;
    repo.state.posts = new Map([[POST_ID, { id: POST_ID, authorId: HOST_ID, status: 'OPEN', commentCount: 0 }]]);
    repo.state.members = members();
    repo.state.party = [];
    repo.state.applications = [];
    repo.state.blocks.clear();
  });

  const as = (memberId) => ({ Authorization: `Bearer ${tokens.createAccessToken(memberId)}` });
  const list = async (query = '', headers = {}, postId = POST_ID) => {
    const res = await fetch(`${baseUrl}/api/posts/${postId}/comments${query}`, { headers });
    return { status: res.status, body: await res.json() };
  };
  const write = async (body, memberId = ALICE, postId = POST_ID) => {
    const res = await fetch(`${baseUrl}/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(memberId === null ? {} : as(memberId)) },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  };

  describe('실시간 신호 (SSE)', () => {
    it('댓글 작성 · 수정 · 삭제가 성공하면 그 공고에 comments 신호를 보낸다', async () => {
      await write({ text: '첫 댓글' });
      const id = repo.state.comments[0].id;
      await send('PATCH', `/api/comments/${id}`, { text: '고친 댓글' });
      await send('DELETE', `/api/comments/${id}`);
      assert.deepEqual(events.log, [[POST_ID, 'comments'], [POST_ID, 'comments'], [POST_ID, 'comments']]);
    });

    it('실패한 요청(빈 내용 · 로그인 없음 · 남의 댓글)은 신호를 보내지 않는다', async () => {
      const id = repo.seed({ authorId: ALICE, content: '앨리스 댓글' });
      await write({ text: '' });
      await write({ text: '로그인 없음' }, null);
      await send('PATCH', `/api/comments/${id}`, { text: '남이 고침' }, BOB);
      await send('DELETE', `/api/comments/${id}`, undefined, BOB);
      assert.deepEqual(events.log, []);
    });
  });

  describe('댓글 달기', () => {
    it('공고 작성자에게 차단당한 회원은 댓글·대댓글 모두 404 POST_NOT_FOUND 이고 저장되지 않는다', async () => {
      await write({ text: '먼저 단 댓글' }, HOST_ID);
      const parentId = repo.state.comments[0].id;
      repo.state.blocks.add(`${HOST_ID}:${ALICE}`);
      for (const body of [{ text: '차단 후 댓글' }, { text: '차단 후 답글', parentId }]) {
        const res = await write(body);
        assert.equal(res.status, 404);
        assert.equal(res.body.error.code, 'POST_NOT_FOUND');
      }
      assert.equal(repo.state.comments.length, 1);
    });

    it('욕설이 들어 있으면 400 (text 필드), 저장하지 않는다', async () => {
      const { status, body } = await write({ text: '개새끼들 ㅋㅋ' });
      assert.equal(status, 400);
      assert.equal(body.error.code, 'PROFANITY_DETECTED');
      assert.deepEqual(body.error.fields.map((f) => f.field), ['text']);
      assert.equal(repo.state.comments.length, 0);
    });

    it('댓글을 저장하고 201 과 작성된 댓글을 돌려준다', async () => {
      const { status, body } = await write({ text: '  극신속 홀나 1625입니다.  ' });
      assert.equal(status, 201);
      assert.deepEqual(body.data, {
        id: 1,
        parentId: null,
        author: { id: ALICE, nickname: '앨리스', avatarUrl: null },
        isPostAuthor: false,
        mine: true,
        text: '극신속 홀나 1625입니다.',
        secret: false,
        hidden: false,
        reported: false,
        accepted: false,
        partyOnly: false,
        partyMember: null,
        createdAt: body.data.createdAt,
      });
      assert.equal(repo.state.posts.get(POST_ID).commentCount, 1);
    });

    it('공고 작성자가 쓰면 isPostAuthor 가 true, 비밀 댓글도 본인에게는 본문이 보인다', async () => {
      const { body } = await write({ text: '디코 링크는 쪽지로 드릴게요', secret: true }, HOST_ID);
      assert.equal(body.data.isPostAuthor, true);
      assert.equal(body.data.secret, true);
      assert.equal(body.data.text, '디코 링크는 쪽지로 드릴게요');
    });

    it('로그인하지 않으면 401', async () => {
      const { status, body } = await write({ text: '안녕하세요' }, null);
      assert.equal(status, 401);
      assert.equal(body.error.code, 'UNAUTHORIZED');
    });

    it('내용이 비었거나 500자를 넘거나 secret 형식이 틀리면 400 INVALID_INPUT', async () => {
      const { status, body } = await write({ text: '   ', secret: 'yes' });
      assert.equal(status, 400);
      assert.equal(body.error.code, 'INVALID_INPUT');
      assert.deepEqual(
        body.error.fields.map((f) => f.field),
        ['text', 'secret'],
      );

      const tooLong = await write({ text: '가'.repeat(501) });
      assert.equal(tooLong.status, 400);
      assert.equal((await write({ text: '가'.repeat(500) })).status, 201);
    });

    it('없거나 삭제된 공고, 잘못된 postId 는 404 POST_NOT_FOUND', async () => {
      assert.equal((await write({ text: '안녕하세요' }, ALICE, 999)).body.error.code, 'POST_NOT_FOUND');
      assert.equal((await write({ text: '안녕하세요' }, ALICE, 'abc')).status, 404);
      repo.state.posts.get(POST_ID).status = 'DELETED';
      assert.equal((await write({ text: '안녕하세요' })).status, 404);
    });

    it('정지 중이면 403 ACCOUNT_SUSPENDED, 정지 기간이 지났으면 작성할 수 있다', async () => {
      Object.assign(repo.state.members.get(ALICE), { status: 'SUSPENDED', suspendedUntil: new Date(NOW.getTime() + 1000) });
      assert.equal((await write({ text: '안녕하세요' })).body.error.code, 'ACCOUNT_SUSPENDED');

      repo.state.members.get(ALICE).suspendedUntil = new Date(NOW.getTime() - 1000);
      assert.equal((await write({ text: '안녕하세요' })).status, 201);

      repo.state.members.get(BOB).status = 'BANNED';
      const banned = await write({ text: '안녕하세요' }, BOB);
      assert.equal(banned.status, 403);
      assert.equal(banned.body.error.code, 'ACCOUNT_BANNED');
      assert.equal(repo.state.comments.length, 1);
    });
  });

  describe('대댓글 달기', () => {
    it('루트 댓글에 대댓글을 단다 (parentId 는 숫자 문자열도 허용)', async () => {
      const rootId = repo.seed({ authorId: ALICE, content: '스펙 확인 부탁드려요' });
      const { status, body } = await write({ text: '확인했습니다!', parentId: String(rootId) }, HOST_ID);
      assert.equal(status, 201);
      assert.equal(body.data.parentId, rootId);
      assert.equal(body.data.isPostAuthor, true);
      assert.equal(repo.state.posts.get(POST_ID).commentCount, 2);
    });

    it('대댓글에 다시 답글을 달면 400 REPLY_DEPTH_EXCEEDED', async () => {
      const rootId = repo.seed({ authorId: ALICE, content: '질문' });
      const replyId = repo.seed({ authorId: HOST_ID, content: '답변', parentId: rootId });
      const { status, body } = await write({ text: '재답변', parentId: replyId });
      assert.equal(status, 400);
      assert.equal(body.error.code, 'REPLY_DEPTH_EXCEEDED');
    });

    it('없거나 삭제됐거나 다른 공고의 댓글이면 404 COMMENT_NOT_FOUND', async () => {
      const deletedId = repo.seed({ authorId: ALICE, content: '삭제됨', status: 'DELETED' });
      const otherPostId = repo.seed({ authorId: ALICE, content: '다른 공고', postId: 2 });
      for (const parentId of [999, deletedId, otherPostId]) {
        const { status, body } = await write({ text: '답글', parentId });
        assert.equal(status, 404, String(parentId));
        assert.equal(body.error.code, 'COMMENT_NOT_FOUND');
      }
    });

    it('parentId 형식이 틀리면 400', async () => {
      const { status, body } = await write({ text: '답글', parentId: 'abc' });
      assert.equal(status, 400);
      assert.equal(body.error.fields[0].field, 'parentId');
    });
  });

  describe('댓글 페이지 조회', () => {
    /** 루트 댓글 6개(c1~c6) + c1 의 대댓글 2개 */
    const seedThread = () => {
      const ids = [];
      for (let i = 1; i <= 6; i += 1) {
        ids.push(repo.seed({ authorId: i % 2 ? ALICE : BOB, content: `댓글 ${i}` }));
        if (i === 1) {
          repo.seed({ authorId: HOST_ID, content: '답글 1', parentId: ids[0] });
          repo.seed({ authorId: BOB, content: '답글 2', parentId: ids[0] });
        }
      }
      return ids;
    };

    it('루트 댓글 기준 4개씩 등록순으로 페이징하고 대댓글을 포함한다 (비로그인 허용)', async () => {
      seedThread();
      const { status, body } = await list();
      assert.equal(status, 200);
      const { items, ...paging } = body.data;
      assert.deepEqual(paging, { page: 1, size: 4, totalCount: 6, totalPages: 2, channel: 'public', commentCount: 8 });
      assert.deepEqual(
        items.map((c) => c.text),
        ['댓글 1', '댓글 2', '댓글 3', '댓글 4'],
      );
      assert.deepEqual(
        items[0].replies.map((r) => [r.text, r.isPostAuthor, r.mine]),
        [
          ['답글 1', true, false],
          ['답글 2', false, false],
        ],
      );
      assert.deepEqual(items[1].replies, []);

      const second = await list('?page=2');
      assert.deepEqual(
        second.body.data.items.map((c) => c.text),
        ['댓글 5', '댓글 6'],
      );
    });

    it('sort=newest 는 루트 댓글을 최신순으로, 대댓글은 항상 등록순으로', async () => {
      seedThread();
      const { body } = await list('?sort=newest&size=6');
      assert.deepEqual(
        body.data.items.map((c) => c.text),
        ['댓글 6', '댓글 5', '댓글 4', '댓글 3', '댓글 2', '댓글 1'],
      );
      assert.deepEqual(
        body.data.items[5].replies.map((r) => r.text),
        ['답글 1', '답글 2'],
      );
    });

    it('로그인하면 내 댓글에 mine 이 표시된다', async () => {
      seedThread();
      const { body } = await list('', as(ALICE));
      assert.deepEqual(
        body.data.items.map((c) => c.mine),
        [true, false, true, false],
      );
    });

    it('비밀 댓글은 댓글 작성자·공고 작성자·부모 댓글 작성자에게만 본문을 보여준다', async () => {
      const rootId = repo.seed({ authorId: ALICE, content: '비밀 질문', isSecret: true });
      repo.seed({ authorId: HOST_ID, content: '비밀 답변', parentId: rootId, isSecret: true });
      const textsFor = async (headers) => {
        const [root] = (await list('', headers)).body.data.items;
        return [root.text, root.replies[0].text];
      };

      assert.deepEqual(await textsFor({}), [null, null]);
      assert.deepEqual(await textsFor(as(BOB)), [null, null]);
      assert.deepEqual(await textsFor(as(ALICE)), ['비밀 질문', '비밀 답변']);
      assert.deepEqual(await textsFor(as(HOST_ID)), ['비밀 질문', '비밀 답변']);
      const [root] = (await list()).body.data.items;
      assert.equal(root.secret, true);
    });

    it('삭제된 댓글은 빠지고(루트가 삭제되면 대댓글도), 관리자 가림 댓글은 hidden 으로 내려준다', async () => {
      const deletedRoot = repo.seed({ authorId: ALICE, content: '삭제된 루트', status: 'DELETED' });
      repo.seed({ authorId: BOB, content: '삭제된 루트의 답글', parentId: deletedRoot });
      const rootId = repo.seed({ authorId: BOB, content: '가려진 댓글', status: 'HIDDEN' });
      repo.seed({ authorId: ALICE, content: '삭제된 답글', parentId: rootId, status: 'DELETED' });

      const { body } = await list();
      assert.equal(body.data.totalCount, 1);
      assert.equal(body.data.items[0].hidden, true);
      assert.equal(body.data.items[0].text, '가려진 댓글');
      assert.deepEqual(body.data.items[0].replies, []);
    });

    it('탈퇴한 작성자는 닉네임을 가린다', async () => {
      repo.seed({ authorId: BOB, content: '안녕하세요' });
      repo.state.members.get(BOB).status = 'WITHDRAWN';
      const { body } = await list();
      assert.deepEqual(body.data.items[0].author, { id: BOB, nickname: '탈퇴한 회원', avatarUrl: null });
    });

    it('댓글이 없으면 빈 목록', async () => {
      const { body } = await list();
      assert.deepEqual(body.data, { items: [], page: 1, size: 4, totalCount: 0, totalPages: 0, channel: 'public', commentCount: 0 });
    });

    it('잘못된 sort·page·size 는 400, 없는 공고는 404', async () => {
      const { status, body } = await list('?sort=hot&page=0&size=99');
      assert.equal(status, 400);
      assert.deepEqual(
        body.error.fields.map((f) => f.field),
        ['sort', 'page', 'size'],
      );
      assert.equal((await list('', {}, 999)).body.error.code, 'POST_NOT_FOUND');
    });
  });

  const send = async (method, path, body, memberId = ALICE) => {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(memberId === null ? {} : as(memberId)) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: res.status === 204 ? null : await res.json() };
  };

  describe('댓글 수정', () => {
    it('수정 내용에 욕설이 있으면 400, 기존 내용은 그대로', async () => {
      const id = repo.seed({ authorId: ALICE, content: '처음 내용' });
      const { status } = await send('PATCH', `/api/comments/${id}`, { text: '시.발 고침' });
      assert.equal(status, 400);
      assert.equal(repo.state.comments[0].content, '처음 내용');
    });

    it('본인 댓글을 고치고 수정된 댓글을 돌려준다', async () => {
      const id = repo.seed({ authorId: ALICE, content: '처음 내용' });
      const { status, body } = await send('PATCH', `/api/comments/${id}`, { text: '  고친 내용 ' });
      assert.equal(status, 200);
      assert.equal(body.data.id, id);
      assert.equal(body.data.text, '고친 내용');
      assert.equal(body.data.mine, true);
      assert.equal(repo.state.comments[0].content, '고친 내용');
    });

    it('다른 사람 댓글은 403 NOT_COMMENT_AUTHOR (공고 작성자도 마찬가지)', async () => {
      const id = repo.seed({ authorId: ALICE, content: '내용' });
      for (const memberId of [BOB, HOST_ID]) {
        const { status, body } = await send('PATCH', `/api/comments/${id}`, { text: '남의 글' }, memberId);
        assert.equal(status, 403);
        assert.equal(body.error.code, 'NOT_COMMENT_AUTHOR');
      }
      assert.equal(repo.state.comments[0].content, '내용');
    });

    it('관리자가 가린 댓글은 403 COMMENT_HIDDEN, 정지 회원은 403 ACCOUNT_SUSPENDED', async () => {
      const hiddenId = repo.seed({ authorId: ALICE, content: '가려짐', status: 'HIDDEN' });
      assert.equal((await send('PATCH', `/api/comments/${hiddenId}`, { text: '수정' })).body.error.code, 'COMMENT_HIDDEN');

      const id = repo.seed({ authorId: ALICE, content: '내용' });
      Object.assign(repo.state.members.get(ALICE), { status: 'SUSPENDED', suspendedUntil: new Date(NOW.getTime() + 1000) });
      assert.equal((await send('PATCH', `/api/comments/${id}`, { text: '수정' })).body.error.code, 'ACCOUNT_SUSPENDED');
    });

    it('빈 내용은 400, 없거나 삭제된 댓글·잘못된 id 는 404, 비로그인은 401', async () => {
      const id = repo.seed({ authorId: ALICE, content: '내용' });
      const deletedId = repo.seed({ authorId: ALICE, content: '삭제됨', status: 'DELETED' });
      assert.equal((await send('PATCH', `/api/comments/${id}`, { text: ' ' })).status, 400);
      assert.equal((await send('PATCH', `/api/comments/${deletedId}`, { text: '수정' })).body.error.code, 'COMMENT_NOT_FOUND');
      assert.equal((await send('PATCH', '/api/comments/999', { text: '수정' })).status, 404);
      assert.equal((await send('PATCH', '/api/comments/abc', { text: '수정' })).body.error.code, 'COMMENT_NOT_FOUND');
      assert.equal((await send('PATCH', `/api/comments/${id}`, { text: '수정' }, null)).status, 401);
    });
  });

  describe('댓글 삭제', () => {
    it('본인 댓글을 대댓글과 함께 삭제하고 204, 공고 댓글 수를 그만큼 줄인다', async () => {
      const rootId = repo.seed({ authorId: ALICE, content: '질문' });
      repo.seed({ authorId: HOST_ID, content: '답변', parentId: rootId });
      repo.seed({ authorId: BOB, content: '이미 삭제된 답글', parentId: rootId, status: 'DELETED' });
      const otherId = repo.seed({ authorId: BOB, content: '다른 댓글' });
      repo.state.posts.get(POST_ID).commentCount = 3; // 삭제된 답글은 이미 빠진 수

      const { status } = await send('DELETE', `/api/comments/${rootId}`);
      assert.equal(status, 204);
      assert.deepEqual(
        repo.state.comments.map((c) => c.status),
        ['DELETED', 'DELETED', 'DELETED', 'VISIBLE'],
      );
      assert.ok(repo.state.comments[0].deletedAt instanceof Date);
      assert.equal(repo.state.posts.get(POST_ID).commentCount, 1);

      const { body } = await list();
      assert.deepEqual(
        body.data.items.map((c) => c.id),
        [otherId],
      );
    });

    it('대댓글만 삭제하면 그 대댓글만 지운다', async () => {
      const rootId = repo.seed({ authorId: BOB, content: '질문' });
      const replyId = repo.seed({ authorId: ALICE, content: '답변', parentId: rootId });
      assert.equal((await send('DELETE', `/api/comments/${replyId}`)).status, 204);
      assert.deepEqual(
        repo.state.comments.map((c) => c.status),
        ['VISIBLE', 'DELETED'],
      );
    });

    it('다른 사람 댓글은 403, 이미 삭제된 댓글은 404', async () => {
      const id = repo.seed({ authorId: ALICE, content: '내용' });
      assert.equal((await send('DELETE', `/api/comments/${id}`, undefined, BOB)).body.error.code, 'NOT_COMMENT_AUTHOR');
      assert.equal((await send('DELETE', `/api/comments/${id}`)).status, 204);
      assert.equal((await send('DELETE', `/api/comments/${id}`)).body.error.code, 'COMMENT_NOT_FOUND');
    });
  });

  describe('댓글 신고', () => {
    const report = (body, memberId = BOB) => send('POST', '/api/reports', body, memberId);
    const valid = (targetId) => ({ targetType: 'COMMENT', targetId, reason: '욕설 및 비하 발언', detail: '  반복 욕설 ' });

    it('신고를 저장하고 201 { id }, 신고한 사람의 목록에서만 reported 로 표시된다', async () => {
      const id = repo.seed({ authorId: ALICE, content: '비매너 댓글' });
      const { status, body } = await report(valid(id));
      assert.equal(status, 201);
      assert.deepEqual(body.data, { id: 1 });
      assert.deepEqual(repo.state.reports[0], {
        id: 1,
        reporterId: BOB,
        targetType: 'COMMENT',
        targetId: id,
        targetMemberId: ALICE,
        postId: POST_ID,
        reasonCode: '욕설 및 비하 발언',
        detail: '반복 욕설',
      });
      assert.equal(repo.state.comments[0].reportCount, 1);

      assert.equal((await list('', as(BOB))).body.data.items[0].reported, true);
      assert.equal((await list('', as(HOST_ID))).body.data.items[0].reported, false);
      assert.equal((await list()).body.data.items[0].reported, false);
    });

    it('회원을 신고하면 201 { id }, 같은 회원 재신고 409, 본인 400, 탈퇴·없는 회원 404', async () => {
      const body = (targetId) => ({ targetType: 'MEMBER', targetId, reason: '욕설 및 비하 발언', detail: ' 채팅 욕설 ' });
      const ok = await report(body(ALICE));
      assert.equal(ok.status, 201);
      assert.deepEqual(repo.state.reports[0], { id: 1, reporterId: BOB, targetType: 'MEMBER', targetId: ALICE, targetMemberId: ALICE, postId: null, reasonCode: '욕설 및 비하 발언', detail: '채팅 욕설' });
      assert.equal((await report(body(ALICE))).body.error.code, 'ALREADY_REPORTED');
      assert.equal((await report(body(BOB))).body.error.code, 'CANNOT_REPORT_SELF');
      repo.state.members.get(HOST_ID).status = 'WITHDRAWN';
      assert.equal((await report(body(HOST_ID))).status, 404);
      assert.equal((await report(body(999))).body.error.code, 'MEMBER_NOT_FOUND');
    });

    it('같은 댓글을 다시 신고하면 409 ALREADY_REPORTED, 본인 댓글은 400 CANNOT_REPORT_SELF', async () => {
      const id = repo.seed({ authorId: ALICE, content: '댓글' });
      await report(valid(id));
      const again = await report(valid(id));
      assert.equal(again.status, 409);
      assert.equal(again.body.error.code, 'ALREADY_REPORTED');

      const self = await report(valid(id), ALICE);
      assert.equal(self.status, 400);
      assert.equal(self.body.error.code, 'CANNOT_REPORT_SELF');
      assert.equal(repo.state.comments[0].reportCount, 1);
    });

    it('서로 다른 5명이 신고하면 댓글이 자동으로 가려진다', async () => {
      const id = repo.seed({ authorId: ALICE, content: '악성 댓글' });
      for (const reporter of [BOB, HOST_ID, 11, 12]) await report(valid(id), reporter);
      assert.equal(repo.state.comments[0].status, 'VISIBLE');
      await report(valid(id), 13);
      assert.equal(repo.state.comments[0].status, 'HIDDEN');
      assert.equal((await list()).body.data.items[0].hidden, true);
    });

    it('입력이 틀리면 400 (지원하지 않는 대상, 목록에 없는 사유, 500자 넘는 상세), 없는 댓글은 404, 비로그인은 401', async () => {
      const { status, body } = await report({ targetType: 'USER', targetId: 'x', reason: '그냥', detail: '가'.repeat(501) });
      assert.equal(status, 400);
      assert.deepEqual(
        body.error.fields.map((f) => f.field),
        ['targetType', 'targetId', 'reason', 'detail'],
      );
      assert.equal((await report(valid(999))).body.error.code, 'COMMENT_NOT_FOUND');
      assert.equal((await report(valid(1), null)).status, 401);
    });
  });
  describe('공고 신고', () => {
    const report = (body, memberId = BOB) => send('POST', '/api/reports', body, memberId);
    const valid = (targetId = POST_ID) => ({ targetType: 'POST', targetId, reason: '부적절한 광고', detail: ' 외부 사이트 홍보 ' });

    it('신고를 저장하고 201 { id }, 신고 대상 회원은 공고 작성자다', async () => {
      const { status, body } = await report(valid());
      assert.equal(status, 201);
      assert.deepEqual(body.data, { id: 1 });
      assert.deepEqual(repo.state.reports[0], {
        id: 1,
        reporterId: BOB,
        targetType: 'POST',
        targetId: POST_ID,
        targetMemberId: HOST_ID,
        postId: POST_ID,
        reasonCode: '부적절한 광고',
        detail: '외부 사이트 홍보',
      });
    });

    it('같은 공고를 다시 신고하면 409 ALREADY_REPORTED, 본인 공고는 400 CANNOT_REPORT_SELF', async () => {
      await report(valid());
      const again = await report(valid());
      assert.equal(again.status, 409);
      assert.equal(again.body.error.code, 'ALREADY_REPORTED');

      const self = await report(valid(), HOST_ID);
      assert.equal(self.status, 400);
      assert.equal(self.body.error.code, 'CANNOT_REPORT_SELF');
      assert.equal(repo.state.reports.length, 1);
    });

    it('같은 id 의 댓글을 신고했어도 공고 신고는 따로 받는다', async () => {
      const id = repo.seed({ authorId: ALICE, content: '댓글' });
      assert.equal(id, POST_ID);
      assert.equal((await report({ targetType: 'COMMENT', targetId: id, reason: '기타' })).status, 201);
      assert.equal((await report(valid())).status, 201);
    });

    it('없거나 삭제된 공고는 404 POST_NOT_FOUND', async () => {
      assert.equal((await report(valid(999))).body.error.code, 'POST_NOT_FOUND');
      repo.state.posts.get(POST_ID).status = 'DELETED';
      assert.equal((await report(valid())).body.error.code, 'POST_NOT_FOUND');
    });
  });

  describe('노쇼 신고', () => {
    const report = (body, memberId = BOB) => send('POST', '/api/reports', body, memberId);
    const valid = (targetId = ALICE, postId = POST_ID) => ({ targetType: 'NO_SHOW', postId, targetId, reason: '연락 없이 불참', detail: ' 30분 기다림 ' });
    /** 앨리스·밥이 승인된 파티원이고 출발 시간이 지난 파티 */
    const startedParty = () => {
      Object.assign(repo.state.posts.get(POST_ID), { scheduleAt: new Date(NOW.getTime() - 3_600_000) });
      for (const [id, memberId] of [[31, ALICE], [32, BOB]]) {
        repo.state.applications.push({ id, postId: POST_ID, applicantId: memberId, status: 'ACCEPTED' });
        repo.state.party.push({ memberId, isHost: false, role: null, mannerTemp: 36.5 });
      }
    };

    it('파티원이 다른 파티원을 신고하면 201, target_id 는 신청 행 id 다', async () => {
      startedParty();
      const { status, body } = await report(valid());
      assert.equal(status, 201);
      assert.deepEqual(body.data, { id: 1 });
      assert.deepEqual(repo.state.reports[0], {
        id: 1,
        reporterId: BOB,
        targetType: 'NO_SHOW',
        targetId: 31,
        targetMemberId: ALICE,
        postId: POST_ID,
        reasonCode: '연락 없이 불참',
        detail: '30분 기다림',
      });
      assert.equal((await report(valid(), HOST_ID)).status, 201);
    });

    it('같은 파티원을 다시 신고하면 409 ALREADY_REPORTED, 본인은 400 CANNOT_REPORT_SELF', async () => {
      startedParty();
      await report(valid());
      assert.equal((await report(valid())).body.error.code, 'ALREADY_REPORTED');
      assert.equal((await report(valid(BOB))).body.error.code, 'CANNOT_REPORT_SELF');
    });

    it('파티원이 아니면 403 NOT_PARTY_MEMBER, 승인된 파티원이 아닌 대상(파티장·대기 중 신청자)은 404', async () => {
      startedParty();
      repo.state.members.set(11, { nickname: '구경꾼', status: 'ACTIVE', suspendedUntil: null });
      assert.equal((await report(valid(), 11)).body.error.code, 'NOT_PARTY_MEMBER');
      assert.equal((await report(valid(HOST_ID))).body.error.code, 'NO_SHOW_TARGET_NOT_FOUND');
      repo.state.applications.push({ id: 33, postId: POST_ID, applicantId: 12, status: 'PENDING' });
      assert.equal((await report(valid(12))).body.error.code, 'NO_SHOW_TARGET_NOT_FOUND');
    });

    it('출발 전이거나 일정 미정이면 409 NO_SHOW_TOO_EARLY, 활동 완료된 파티는 일정과 상관없이 받는다', async () => {
      startedParty();
      const post = repo.state.posts.get(POST_ID);
      post.scheduleAt = new Date(NOW.getTime() + 3_600_000);
      assert.equal((await report(valid())).body.error.code, 'NO_SHOW_TOO_EARLY');
      post.scheduleAt = null;
      assert.equal((await report(valid())).body.error.code, 'NO_SHOW_TOO_EARLY');
      post.status = 'COMPLETED';
      assert.equal((await report(valid())).status, 201);
    });

    it('postId 가 없거나 노쇼 사유가 아니면 400, 없는 공고는 404', async () => {
      const { status, body } = await report({ targetType: 'NO_SHOW', targetId: ALICE, reason: '욕설 및 비하 발언' });
      assert.equal(status, 400);
      assert.deepEqual(body.error.fields.map((f) => f.field), ['postId', 'reason']);
      assert.equal((await report(valid(ALICE, 999))).body.error.code, 'POST_NOT_FOUND');
    });
  });

  describe('답글 채택', () => {
    const accept = (id, memberId = ALICE) => send('PUT', `/api/comments/${id}/accept`, undefined, memberId);
    const cancel = (id, memberId = ALICE) => send('DELETE', `/api/comments/${id}/accept`, undefined, memberId);
    /** 앨리스의 댓글(질문) 아래에 밥·호스트가 답글을 단 상태 */
    const thread = () => {
      const root = repo.seed({ authorId: ALICE, content: '스펙 얼마나 필요해요?' });
      const first = repo.seed({ authorId: HOST_ID, parentId: root, content: '1600 이상이요' });
      const second = repo.seed({ authorId: BOB, parentId: root, content: '1620 권장입니다' });
      return { root, first, second };
    };
    const replies = async () => (await list()).body.data.items[0];

    it('댓글 작성자가 답글을 채택하면 그 답글은 제자리에서 accepted 표시만 붙고 acceptedReplyId 가 내려가며, comments 신호를 보낸다', async () => {
      const { root, first, second } = thread();
      const res = await accept(second);
      assert.equal(res.status, 200);
      assert.deepEqual(res.body.data, { commentId: root, acceptedReplyId: second });
      assert.deepEqual(events.log, [[POST_ID, 'comments']]);

      const item = await replies();
      assert.equal(item.acceptedReplyId, second);
      assert.deepEqual(item.replies.map((r) => [r.id, r.accepted]), [[first, false], [second, true]]); // 순서는 등록순 그대로
      assert.equal(item.accepted, false);
    });

    it('다른 답글을 채택하면 채택이 그 답글로 바뀌고(댓글당 하나), 채택 취소하면 acceptedReplyId 가 null 이다', async () => {
      const { first, second } = thread();
      await accept(first);
      await accept(second);
      assert.equal((await replies()).acceptedReplyId, second);

      assert.equal((await cancel(first)).status, 204); // 채택된 답글이 아니면 아무 일도 없음
      assert.equal((await replies()).acceptedReplyId, second);
      assert.equal((await cancel(second)).status, 204);
      const item = await replies();
      assert.equal(item.acceptedReplyId, null);
      assert.deepEqual(item.replies.map((r) => r.id), [first, second]);
    });

    it('댓글 작성자가 아니면 403 (공고 작성자나 답글 작성자도 안 됨), 로그인이 없으면 401', async () => {
      const { second } = thread();
      for (const memberId of [HOST_ID, BOB]) {
        const res = await accept(second, memberId);
        assert.equal(res.status, 403);
        assert.equal(res.body.error.code, 'NOT_PARENT_AUTHOR');
      }
      assert.equal((await cancel(second, HOST_ID)).status, 403);
      assert.equal((await fetch(`${baseUrl}/api/comments/${second}/accept`, { method: 'PUT' })).status, 401);
      assert.equal((await replies()).acceptedReplyId, null);
    });

    it('답글이 아닌 댓글은 채택할 수 없다', async () => {
      const { root } = thread();
      assert.equal((await accept(root)).body.error.code, 'NOT_A_REPLY');
      assert.equal((await cancel(root)).body.error.code, 'NOT_A_REPLY');
    });

    it('본인 답글 · 비밀 답글 · 가려진 답글 · 없는 댓글은 채택할 수 없다', async () => {
      const { root } = thread();
      const own = repo.seed({ authorId: ALICE, parentId: root, content: '내 답글' });
      const secret = repo.seed({ authorId: BOB, parentId: root, content: '비밀', isSecret: true });
      const hidden = repo.seed({ authorId: BOB, parentId: root, content: '가림', status: 'HIDDEN' });
      assert.equal((await accept(own)).body.error.code, 'CANNOT_ACCEPT_OWN');
      assert.equal((await accept(secret)).body.error.code, 'CANNOT_ACCEPT_SECRET');
      assert.equal((await accept(hidden)).body.error.code, 'COMMENT_HIDDEN');
      assert.equal((await accept(999)).status, 404);
      assert.equal((await accept('abc')).status, 404);
      assert.deepEqual(events.log, []);
    });

    it('채택된 답글을 작성자가 고치면 채택이 풀리고(응답도 accepted false), 다른 답글을 고쳐도 채택은 그대로다', async () => {
      const { first, second } = thread();
      await accept(second);
      const other = await send('PATCH', `/api/comments/${first}`, { text: '다른 답글 수정' }, HOST_ID);
      assert.equal(other.status, 200);
      assert.equal((await replies()).acceptedReplyId, second);

      const edited = await send('PATCH', `/api/comments/${second}`, { text: '채택 뒤에 내용을 바꿈' }, BOB);
      assert.equal(edited.status, 200);
      assert.equal(edited.body.data.accepted, false);
      const item = await replies();
      assert.equal(item.acceptedReplyId, null);
      assert.deepEqual(item.replies.map((r) => r.accepted), [false, false]);
    });

    it('채택된 답글이 가려지거나 삭제되면 채택이 없는 것으로 내려간다', async () => {
      const { second } = thread();
      await accept(second);
      repo.state.comments.find((c) => c.id === second).status = 'HIDDEN';
      assert.equal((await replies()).acceptedReplyId, null);
      repo.state.comments.find((c) => c.id === second).status = 'DELETED';
      assert.equal((await replies()).acceptedReplyId, null);
    });
  });

  describe('참가자 전용 댓글 (channel=party)', () => {
    // 앨리스는 승인된 파티원, 밥은 파티원이 아님
    const joinAlice = () => repo.state.party.push({ memberId: ALICE, isHost: false, role: '워로드 (딜러)', mannerTemp: 99.8 });
    const partyList = (memberId, query = '') => list(`?channel=party${query}`, memberId === null ? {} : as(memberId));

    it('파티원이 쓴 참가자 전용 댓글은 파티 정보와 함께 저장되고 공고 comment_count 에는 들어가지 않는다', async () => {
      joinAlice();
      const { status, body } = await write({ text: '암호 1번 맡을게요', channel: 'party', secret: true });
      assert.equal(status, 201);
      assert.equal(body.data.partyOnly, true);
      assert.equal(body.data.secret, false, '참가자 전용 채널에는 비밀 댓글이 없다');
      assert.deepEqual(body.data.partyMember, { isHost: false, role: '워로드 (딜러)', mannerTemp: 99.8 });
      assert.equal(repo.state.posts.get(POST_ID).commentCount, 0);
    });

    it('공개 목록과 참가자 전용 목록은 서로의 댓글을 섞지 않는다', async () => {
      joinAlice();
      repo.seed({ authorId: BOB, content: '공개 댓글' });
      const party = repo.seed({ authorId: HOST_ID, content: '공대원 공지', isPartyOnly: true });
      repo.seed({ authorId: ALICE, parentId: party, content: '확인했습니다', isPartyOnly: true });

      const open = (await list()).body.data;
      assert.deepEqual(open.items.map((c) => c.text), ['공개 댓글']);
      assert.equal(open.commentCount, 1);

      const { status, body } = await partyList(ALICE);
      assert.equal(status, 200);
      assert.equal(body.data.channel, 'party');
      assert.equal(body.data.totalCount, 1);
      assert.equal(body.data.commentCount, 2, '답글까지 센 채널 댓글 수');
      const [root] = body.data.items;
      assert.equal(root.text, '공대원 공지');
      assert.deepEqual(root.partyMember, { isHost: true, role: null, mannerTemp: 36.5 });
      assert.deepEqual(root.replies.map((r) => [r.text, r.partyMember?.role]), [['확인했습니다', '워로드 (딜러)']]);
    });

    it('파티원이 아니면 403 PARTY_ONLY, 비로그인은 401 — 목록도 작성도 막는다', async () => {
      const outsider = await partyList(BOB);
      assert.equal(outsider.status, 403);
      assert.equal(outsider.body.error.code, 'PARTY_ONLY');
      assert.equal((await partyList(null)).status, 401);

      const written = await write({ text: '몰래 쓰기', channel: 'party' }, BOB);
      assert.equal(written.status, 403);
      assert.equal(repo.state.comments.length, 0);
    });

    it('공대장은 신청 없이도 참가자 전용 댓글을 보고 쓸 수 있다', async () => {
      assert.equal((await partyList(HOST_ID)).status, 200);
      assert.equal((await write({ text: '출발 10분 전 집합', channel: 'party' }, HOST_ID)).status, 201);
    });

    it('참가자 전용 댓글의 답글은 channel 을 보내지 않아도 참가자 전용이 되고, 파티원이 아니면 달 수 없다', async () => {
      joinAlice();
      const root = repo.seed({ authorId: HOST_ID, content: '공지', isPartyOnly: true });
      const reply = await write({ text: '넵', parentId: root });
      assert.equal(reply.status, 201);
      assert.equal(reply.body.data.partyOnly, true);
      assert.equal((await write({ text: '저도요', parentId: root }, BOB)).status, 403);
    });

    it('파티원이 아니면 참가자 전용 댓글을 신고할 수 없고, 파티를 떠난 작성자는 고칠 수 없지만 지울 수는 있다', async () => {
      const id = repo.seed({ authorId: ALICE, content: '떠나기 전 댓글', isPartyOnly: true });
      const report = await send('POST', '/api/reports', { targetType: 'COMMENT', targetId: id, reason: '기타' }, BOB);
      assert.equal(report.status, 403);
      assert.equal((await send('PATCH', `/api/comments/${id}`, { text: '수정' })).status, 403);
      assert.equal((await send('DELETE', `/api/comments/${id}`)).status, 204);
      assert.equal(repo.state.posts.get(POST_ID).commentCount, 0, '세지 않았던 댓글이라 줄이지도 않음');
    });

    it('channel 값이 틀리면 400 INVALID_INPUT', async () => {
      const { status, body } = await list('?channel=secret');
      assert.equal(status, 400);
      assert.equal(body.error.fields[0].field, 'channel');
      assert.equal((await write({ text: '안녕', channel: 'vip' })).status, 400);
    });
  });
});
