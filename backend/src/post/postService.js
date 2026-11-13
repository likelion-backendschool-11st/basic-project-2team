'use strict';

const { ApiError } = require('../common/ApiError');
const { postMessages } = require('./postConstants');
const { validateCreatePost, validateDraft } = require('./postValidator');

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

  return { createPost, saveDraft, getLatestDraft };
}

module.exports = { createPostService };
