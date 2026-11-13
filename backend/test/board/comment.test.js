'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../../src/app');
const { createTokenProvider } = require('../../src/common/tokenProvider');

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
  const state = { posts: new Map(), members: new Map(), comments: [], reports: [], seconds: 0 };
  const alive = (c) => c.status !== 'DELETED';
  const withAuthor = (c) => {
    const m = state.members.get(c.authorId);
    return {
      id: c.id,
      postId: c.postId,
      parentId: c.parentId,
      content: c.content,
      isSecret: c.isSecret ? 1 : 0,
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
        status: 'VISIBLE',
        reportCount: 0,
        postId: POST_ID,
        createdAt: new Date(NOW.getTime() - 3600000 + state.seconds * 1000),
        ...comment,
      };
      state.comments.push(row);
      const post = state.posts.get(row.postId);
      if (post) post.commentCount += 1;
      return row.id;
    },
    async findPost(postId) {
      const post = state.posts.get(postId);
      return post && post.status !== 'DELETED' ? { id: post.id, authorId: post.authorId } : null;
    },
    async findMemberStatus(memberId) {
      const m = state.members.get(memberId);
      return m ? { status: m.status, suspendedUntil: m.suspendedUntil } : null;
    },
    async findParentComment(postId, commentId) {
      const c = state.comments.find((x) => x.id === commentId && x.postId === postId && alive(x));
      return c ? { id: c.id, parentId: c.parentId, authorId: c.authorId } : null;
    },
    async createComment({ postId, authorId, parentId, content, isSecret }) {
      return this.seed({ postId, authorId, parentId, content, isSecret });
    },
    async findCommentById(id) {
      const c = state.comments.find((x) => x.id === id);
      return c ? withAuthor(c) : null;
    },
    async findRootCommentPage({ postId, sort, limit, offset }) {
      const roots = state.comments.filter((c) => c.postId === postId && c.parentId === null && alive(c)).sort(byTime);
      if (sort === 'newest') roots.reverse();
      return { rows: roots.slice(offset, offset + limit).map(withAuthor), totalCount: roots.length };
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
      return { ...withAuthor(c), postAuthorId: post.authorId, parentAuthorId: parent?.authorId ?? null };
    },
    async updateCommentContent(commentId, content) {
      state.comments.find((x) => x.id === commentId).content = content;
    },
    async deleteCommentWithReplies({ commentId, postId, deletedAt }) {
      const targets = state.comments.filter((c) => (c.id === commentId || c.parentId === commentId) && alive(c));
      for (const c of targets) Object.assign(c, { status: 'DELETED', deletedAt });
      const post = state.posts.get(postId);
      post.commentCount = Math.max(0, post.commentCount - targets.length);
      return targets.length;
    },
    async createCommentReport({ reporterId, commentId, targetMemberId, postId, reasonCode, detail }) {
      if (state.reports.some((r) => r.reporterId === reporterId && r.targetId === commentId)) return null;
      state.reports.push({ id: state.reports.length + 1, reporterId, targetId: commentId, targetMemberId, postId, reasonCode, detail });
      const c = state.comments.find((x) => x.id === commentId);
      if (c.status === 'VISIBLE' && c.reportCount + 1 >= 5) c.status = 'HIDDEN';
      c.reportCount += 1;
      return state.reports.length;
    },
    async findReportedCommentIds(memberId, commentIds) {
      return new Set(
        state.reports.filter((r) => r.reporterId === memberId && commentIds.includes(r.targetId)).map((r) => r.targetId),
      );
    },
  };
}

describe('댓글 API /api/posts/:postId/comments', () => {
  let server;
  let baseUrl;
  const repo = createFakeRepository();
  const tokens = createTokenProvider(AUTH);

  before(async () => {
    const app = createApp({ commentRepository: repo, corsOrigins: [], bcryptRounds: 4, auth: AUTH, now: () => NOW });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://localhost:${server.address().port}`;
  });
  after(() => server.close());
  beforeEach(() => {
    repo.state.comments.length = 0;
    repo.state.reports.length = 0;
    repo.state.seconds = 0;
    repo.state.posts = new Map([[POST_ID, { id: POST_ID, authorId: HOST_ID, status: 'OPEN', commentCount: 0 }]]);
    repo.state.members = members();
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

  describe('댓글 달기', () => {
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
      assert.deepEqual(paging, { page: 1, size: 4, totalCount: 6, totalPages: 2 });
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
      assert.deepEqual(body.data, { items: [], page: 1, size: 4, totalCount: 0, totalPages: 0 });
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

    it('입력이 틀리면 400 (COMMENT 외 대상, 목록에 없는 사유, 500자 넘는 상세), 없는 댓글은 404, 비로그인은 401', async () => {
      const { status, body } = await report({ targetType: 'POST', targetId: 'x', reason: '그냥', detail: '가'.repeat(501) });
      assert.equal(status, 400);
      assert.deepEqual(
        body.error.fields.map((f) => f.field),
        ['targetType', 'targetId', 'reason', 'detail'],
      );
      assert.equal((await report(valid(999))).body.error.code, 'COMMENT_NOT_FOUND');
      assert.equal((await report(valid(1), null)).status, 401);
    });
  });
});
