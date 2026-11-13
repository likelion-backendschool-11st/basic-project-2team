'use strict';

const { ApiError } = require('../common/ApiError');
const { postMessages, STATUS_CHANGE_RESULT } = require('./postConstants');
const { validateCreatePost, validateDraft, validateStatusChange } = require('./postValidator');

/** postId 가 1 이상의 정수가 아니면 null (공고 상세와 같이 404 로 처리) */
const parsePostId = (raw) => (/^[1-9]\d*$/.test(raw) && Number.isSafeInteger(Number(raw)) ? Number(raw) : null);
const postNotFound = () => new ApiError(404, 'POST_NOT_FOUND', postMessages.postNotFound);

/**
 * 공고 작성 비즈니스 로직.
 * @param {{ postRepository: ReturnType<typeof import('./postRepository').createPostRepository>, now?: () => Date }} deps
 */
function createPostService({ postRepository, now = () => new Date() }) {
  /** POST /api/posts */
  async function createPost(authorId, body) {
    const input = validateCreatePost(body, now());

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

    const id = await postRepository.createPost({
      post: {
        authorId,
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
      },
      tags: input.tags,
    });
    return { id };
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
    const notFound = () => new ApiError(404, 'POST_NOT_FOUND', postMessages.postNotFound);
    if (!/^[1-9]\d*$/.test(postId) || !Number.isSafeInteger(Number(postId))) throw notFound();

    const post = await postRepository.findPostAuthor(Number(postId));
    if (!post) throw notFound();
    if (post.authorId !== memberId) throw new ApiError(403, 'NOT_POST_AUTHOR', postMessages.notPostAuthor);
    if (!(await postRepository.softDeletePost(Number(postId), now()))) throw notFound();
  }

  /**
   * PATCH /api/posts/:postId/status — 작성자만 모집 상태를 바꿉니다.
   * OPEN ↔ CLOSED 는 자유롭게, COMPLETED(활동 완료)는 승인된 파티원이 있을 때만이며 되돌릴 수 없습니다.
   * 활동 완료가 되면 파티원끼리 별점 평가(POST /api/posts/:postId/reviews)를 할 수 있습니다.
   * @returns {Promise<{ id: number, status: string }>}
   */
  async function changePostStatus(rawPostId, memberId, body) {
    const postId = parsePostId(rawPostId);
    if (postId === null) throw postNotFound();
    const post = await postRepository.findPostAuthor(postId);
    if (!post) throw postNotFound();
    if (post.authorId !== memberId) throw new ApiError(403, 'NOT_POST_AUTHOR', postMessages.notPostAuthorForStatus);
    const status = validateStatusChange(body);

    const result = await postRepository.changePostStatus(postId, status);
    if (result === STATUS_CHANGE_RESULT.notFound) throw postNotFound();
    if (result === STATUS_CHANGE_RESULT.alreadyCompleted) {
      throw new ApiError(409, 'POST_ALREADY_COMPLETED', postMessages.alreadyCompleted);
    }
    if (result === STATUS_CHANGE_RESULT.noPartyMembers) {
      throw new ApiError(409, 'NO_PARTY_MEMBERS', postMessages.noPartyMembers);
    }
    return { id: postId, status };
  }

  return { createPost, saveDraft, getLatestDraft, deletePost, changePostStatus };
}

module.exports = { createPostService };
