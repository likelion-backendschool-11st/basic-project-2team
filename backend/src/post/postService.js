'use strict';

const { ApiError } = require('../common/ApiError');
const { postMessages } = require('./postConstants');
const { validateCreatePost } = require('./postValidator');

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

  return { createPost };
}

module.exports = { createPostService };
