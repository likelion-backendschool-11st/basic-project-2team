'use strict';

const express = require('express');
const cors = require('cors');
const { env } = require('./config/env');
const { notFoundHandler, errorHandler } = require('./common/errorHandler');
const { createTokenProvider } = require('./common/tokenProvider');
const { createRequireAuth } = require('./common/authMiddleware');
const { createMailer } = require('./common/mailer');
const { createEmailVerificationModule } = require('./emailVerification');
const { createMemberModule } = require('./member');
const { createPostModule } = require('./post');

/**
 * Express 앱을 만듭니다. 서버 실행(server.js)과 분리해 테스트에서 DB 없이 띄울 수 있게 합니다.
 * @param {{
 *   pool?: import('mysql2/promise').Pool,
 *   memberRepository?: object,
 *   postRepository?: object,
 *   emailVerificationRepository?: object,
 *   mailer?: ReturnType<typeof createMailer>,
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
  emailVerificationRepository,
  mailer = createMailer(env.mail),
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

  const emailVerification = createEmailVerificationModule({
    pool,
    emailVerificationRepository,
    tokenProvider,
    mailer,
    now,
  });
  app.use('/api/auth/email', emailVerification.router);

  const member = createMemberModule({ pool, memberRepository, tokenProvider, requireAuth, bcryptRounds, now });
  app.use('/api/auth', member.router);

  const post = createPostModule({ pool, postRepository, requireAuth, now });
  app.use('/api/posts', post.router);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
