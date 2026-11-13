'use strict';

const express = require('express');
const cors = require('cors');
const { env } = require('./config/env');
const { notFoundHandler, errorHandler } = require('./common/errorHandler');
const { createTokenProvider } = require('./common/tokenProvider');
const { createRequireAuth, createOptionalAuth, createRequireAdmin } = require('./common/authMiddleware');
const { createMemberModule } = require('./member');
const { createPostModule } = require('./post');
const { createGameModule } = require('./game');
const { createBoardModule } = require('./board');
const { createAdminModule } = require('./admin');
const { createMypageModule } = require('./mypage');

/**
 * Express 앱을 만듭니다. 서버 실행(server.js)과 분리해 테스트에서 DB 없이 띄울 수 있게 합니다.
 * @param {{
 *   pool?: import('mysql2/promise').Pool,
 *   memberRepository?: object,
 *   postRepository?: object,
 *   gameRepository?: object,
 *   boardRepository?: object,
 *   adminRepository?: object,
 *   mypageRepository?: object,
 *   corsOrigins: string[],
 *   bcryptRounds: number,
 *   auth?: typeof env.auth,
 *   now?: () => Date,
 * }} options
 */
function createApp({
  pool,
  memberRepository,
  postRepository,
  gameRepository,
  boardRepository,
  adminRepository,
  mypageRepository,
  corsOrigins,
  bcryptRounds,
  auth = env.auth,
  now,
}) {
  const app = express();

  app.use(cors({ origin: corsOrigins }));
  app.use(express.json());

  const tokenProvider = createTokenProvider(auth);
  const requireAuth = createRequireAuth(tokenProvider);
  const optionalAuth = createOptionalAuth(tokenProvider);
  const requireAdmin = createRequireAdmin(tokenProvider);

  const member = createMemberModule({ pool, memberRepository, tokenProvider, requireAuth, bcryptRounds, now });
  app.use('/api/auth', member.router);

  const post = createPostModule({ pool, postRepository, requireAuth, now });
  app.use('/api/posts', post.router);
  app.use('/api/games', createGameModule({ pool, gameRepository }).router);

  // GET /api/posts/:postId 를 잡으므로 /api/posts 아래 고정 경로(popular, urgent …)는 이보다 먼저 마운트된 라우터에 둡니다.
  const board = createBoardModule({ pool, boardRepository, optionalAuth });
  app.use('/api/posts', board.router);
  const admin = createAdminModule({ pool, adminRepository, tokenProvider, requireAdmin, bcryptRounds, now });
  app.use('/api/admin', admin.router);
  const mypage = createMypageModule({ pool, mypageRepository, requireAuth, optionalAuth });
  app.use('/api/members', mypage.router);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
