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
const { createPartyModule } = require('./party');
const { createNotificationModule } = require('./notification');
const { createCategoryModule } = require('./category');
const { createBoardModule } = require('./board');
const { createAdminModule } = require('./admin');
const { createMypageModule } = require('./mypage');
const { createAccountModule } = require('./account');
const { createReviewModule } = require('./review');
const { createRankingModule } = require('./ranking');

/**
 * Express 앱을 만듭니다. 서버 실행(server.js)과 분리해 테스트에서 DB 없이 띄울 수 있게 합니다.
 * @param {{
 *   pool?: import('mysql2/promise').Pool,
 *   memberRepository?: object,
 *   postRepository?: object,
 *   gameRepository?: object,
 *   partyRepository?: object,
 *   notificationRepository?: object,
 *   categoryRepository?: object,
 *   boardRepository?: object,
 *   commentRepository?: object,
 *   adminRepository?: object,
 *   mypageRepository?: object,
 *   accountRepository?: object,
 *   reviewRepository?: object,
 *   rankingRepository?: object,
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
  partyRepository,
  notificationRepository,
  categoryRepository,
  boardRepository,
  commentRepository,
  adminRepository,
  mypageRepository,
  accountRepository,
  reviewRepository,
  rankingRepository,
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
  app.use('/api/posts', createPartyModule({ pool, partyRepository, requireAuth, now }).router);
  app.use('/api/notifications', createNotificationModule({ pool, notificationRepository, requireAuth }).router);
  app.use('/api/categories', createCategoryModule({ pool, categoryRepository }).router);

  const review = createReviewModule({ pool, reviewRepository, requireAuth });
  app.use('/api/posts', review.postReviewRouter);
  app.use('/api/review-tags', review.tagRouter);
  app.use('/api/rankings', createRankingModule({ pool, rankingRepository }).router);

  // GET /api/posts/:postId 를 잡으므로 /api/posts 아래 고정 경로(popular, urgent …)는 이보다 먼저 마운트된 라우터에 둡니다.
  const board = createBoardModule({
    pool,
    boardRepository,
    commentRepository,
    requireAuth,
    optionalAuth,
    now,
  });
  app.use('/api/posts', board.router);
  app.use('/api/comments', board.commentRouter);
  app.use('/api/reports', board.reportRouter);

  const admin = createAdminModule({ pool, adminRepository, tokenProvider, requireAdmin, bcryptRounds, now });
  app.use('/api/admin', admin.router);
  // GET /api/members/:memberId(mypage)가 /me 를 잡지 않도록 account 를 먼저 마운트합니다.
  const account = createAccountModule({ pool, accountRepository, requireAuth, bcryptRounds, now });
  app.use('/api/members', account.router);
  const mypage = createMypageModule({ pool, mypageRepository, requireAuth, optionalAuth });
  app.use('/api/members', mypage.router);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
