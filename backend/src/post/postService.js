'use strict';

const { ApiError } = require('../common/ApiError');
const { postMessages, POST_STATUS_COMPLETED } = require('./postConstants');
const { validateCreatePost, validateDraft } = require('./postValidator');

/**
 * 공고 작성 비즈니스 로직.
 * @param {{ postRepository: ReturnType<typeof import('./postRepository').createPostRepository>, now?: () => Date }} deps
 */
function createPostService({ postRepository, now = () => new Date() }) {
  /** 게임·상세 분류·인원 규칙을 확인해 저장할 post 컬럼 값을 만듭니다. 작성과 수정이 같이 씁니다. */
  async function resolvePostFields(input) {
    const game = await postRepository.findGameByCode(input.game);
    if (!game) throw new ApiError(404, 'GAME_NOT_FOUND', postMessages.gameNotFound);

    let gameContentId = null;
    if (input.detail) {
      const content = await postRepository.findGameContent(game.id, input.detail);
      if (!content) throw new ApiError(404, 'GAME_CONTENT_NOT_FOUND', postMessages.detailNotFound);
      if (content.type !== input.type) {
        throw new ApiError(400, 'INVALID_INPUT', postMessages.invalidInput, [
          { field: 'detail', message: postMessages.detailTypeMismatch },
        ]);
      }
      if (input.headcount > content.maxHeadcount) {
        throw new ApiError(400, 'INVALID_INPUT', postMessages.invalidInput, [
          { field: 'headcount', message: postMessages.headcountOverMax(content.maxHeadcount) },
        ]);
      }
      gameContentId = content.id;
    }

    return {
      categoryCode: game.categoryCode,
      gameId: game.id,
      gameContentId,
      partyType: input.type,
      title: input.title,
      body: input.body,
      partyName: input.partyName,
      playStyle: input.style,
      headcount: input.headcount,
      scheduleAt: input.scheduleAt,
      voiceRequired: input.voiceRequired,
    };
  }

  /** POST /api/posts */
  async function createPost(authorId, body) {
    const input = validateCreatePost(body, now());
    const fields = await resolvePostFields(input);
    const id = await postRepository.createPost({ post: { authorId, ...fields }, tags: input.tags });
    return { id };
  }

  const parsePostId = (postId) => {
    if (!/^[1-9]\d*$/.test(postId) || !Number.isSafeInteger(Number(postId))) {
      throw new ApiError(404, 'POST_NOT_FOUND', postMessages.postNotFound);
    }
    return Number(postId);
  };

  const headcountBelowCurrent = (current) =>
    new ApiError(400, 'INVALID_INPUT', postMessages.invalidInput, [
      { field: 'headcount', message: postMessages.headcountBelowCurrent(current) },
    ]);

  /**
   * PUT /api/posts/:postId — 작성자만, 작성할 때와 같은 필드를 통째로 다시 보냅니다(태그는 보낸 것으로 교체).
   * 완료된 공고는 못 고치고, 모집 인원은 확정 인원보다 줄일 수 없습니다.
   * 모집 중인데 인원을 확정 인원까지 줄이면 자리가 없으니 모집 마감으로 바꿉니다.
   */
  async function updatePost(rawPostId, memberId, body) {
    const postId = parsePostId(rawPostId);
    const current = await postRepository.findPostAuthor(postId);
    if (!current) throw new ApiError(404, 'POST_NOT_FOUND', postMessages.postNotFound);
    if (current.authorId !== memberId) throw new ApiError(403, 'NOT_POST_AUTHOR', postMessages.notPostAuthorEdit);
    if (current.status === POST_STATUS_COMPLETED) throw new ApiError(409, 'POST_NOT_EDITABLE', postMessages.notEditable);

    const input = validateCreatePost(body, now(), current.scheduleAt ? new Date(current.scheduleAt) : null);
    const fields = await resolvePostFields(input);

    const { result, currentCount } = await postRepository.updatePost({ postId, post: fields, tags: input.tags });
    if (result === 'NOT_FOUND') throw new ApiError(404, 'POST_NOT_FOUND', postMessages.postNotFound);
    if (result === 'NOT_EDITABLE') throw new ApiError(409, 'POST_NOT_EDITABLE', postMessages.notEditable);
    if (result === 'HEADCOUNT_BELOW') throw headcountBelowCurrent(currentCount);
    return { id: postId };
  }

  /** mysql2 는 JSON 컬럼을 객체로 돌려주지만 문자열로 올 수도 있어 둘 다 받습니다. */
  const toDraftResponse = (row) => ({
    draft: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
    savedAt: new Date(row.savedAt).toISOString(),
  });

  /** POST /api/posts/drafts — 새로 저장하면 이전 임시저장을 덮어씁니다. */
  async function saveDraft(memberId, body) {
    return toDraftResponse(await postRepository.saveDraft(memberId, validateDraft(body)));
  }

  /** GET /api/posts/drafts/latest — 없으면 null */
  async function getLatestDraft(memberId) {
    const row = await postRepository.findDraft(memberId);
    return row ? toDraftResponse(row) : null;
  }

  /**
   * DELETE /api/posts/:postId — 작성자만 지울 수 있고, 소프트 삭제입니다.
   * postId 가 1 이상의 정수가 아니어도 404 입니다(공고 상세와 같은 규칙).
   */
  async function deletePost(postId, memberId) {
    const id = parsePostId(postId);
    const notFound = () => new ApiError(404, 'POST_NOT_FOUND', postMessages.postNotFound);

    const post = await postRepository.findPostAuthor(id);
    if (!post) throw notFound();
    if (post.authorId !== memberId) throw new ApiError(403, 'NOT_POST_AUTHOR', postMessages.notPostAuthor);
    if (!(await postRepository.softDeletePost(id, now()))) throw notFound();
  }

  /** 스크랩이 걸린 공고인지 확인합니다. 없거나 삭제된 공고는 404 입니다. */
  async function assertPostExists(rawPostId) {
    const postId = parsePostId(rawPostId);
    if (!(await postRepository.findPostAuthor(postId))) throw new ApiError(404, 'POST_NOT_FOUND', postMessages.postNotFound);
    return postId;
  }

  /** POST /api/posts/:postId/scrap — 이미 스크랩했어도 성공합니다(멱등). */
  async function scrapPost(rawPostId, memberId) {
    await postRepository.addScrap(memberId, await assertPostExists(rawPostId));
  }

  /** DELETE /api/posts/:postId/scrap — 스크랩하지 않았어도 성공합니다(멱등). */
  async function unscrapPost(rawPostId, memberId) {
    await postRepository.removeScrap(memberId, await assertPostExists(rawPostId));
  }

  return { createPost, saveDraft, getLatestDraft, updatePost, scrapPost, unscrapPost, deletePost };
}

module.exports = { createPostService };
