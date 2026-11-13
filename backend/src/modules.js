'use strict';

const { createMemberModule } = require('./member');
const { createPostModule } = require('./post');
const { createGameModule } = require('./game');
const { createBoardModule } = require('./board');
const { createAdminModule } = require('./admin');

/**
 * 도메인 모듈 목록. app.js 는 이 목록을 위에서부터 마운트하므로, 새 도메인은 여기에만 추가합니다.
 * 각 모듈의 create 함수는 app.js 가 만든 의존성(pool, tokenProvider, requireAuth, optionalAuth, requireAdmin,
 * bcryptRounds, now 와 테스트용 `xxxRepository`)을 한 객체로 받아 `{ router }` 를 돌려줍니다.
 *
 * 순서가 중요합니다: 같은 경로를 나눠 쓰는 라우터는 구체적인 경로가 먼저 오도록 둡니다.
 * (예: board 의 GET /api/posts/:postId 는 /api/posts 아래 고정 경로(popular, urgent …)보다 뒤에 둡니다.)
 */
const modules = [
  { path: '/api/auth', create: createMemberModule },
  { path: '/api/posts', create: createPostModule },
  { path: '/api/games', create: createGameModule },
  { path: '/api/posts', create: createBoardModule },
  { path: '/api/admin', create: createAdminModule },
];

module.exports = { modules };
