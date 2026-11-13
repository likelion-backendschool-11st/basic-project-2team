'use strict';

const { createMemberRepository } = require('./memberRepository');
const { createMemberService } = require('./memberService');
const { createMemberController } = require('./memberController');
const { createMemberRouter } = require('./memberRoutes');

/** repository → service → controller → router 를 조립합니다. 테스트에서는 repository 를 바꿔 끼웁니다. */
function createMemberModule({
  pool,
  memberRepository = createMemberRepository(pool),
  tokenProvider,
  requireAuth,
  bcryptRounds,
  now,
}) {
  const memberService = createMemberService({ memberRepository, tokenProvider, bcryptRounds, now });
  const memberController = createMemberController(memberService);
  return { router: createMemberRouter(memberController, { requireAuth }) };
}

module.exports = { createMemberModule };
