'use strict';

const express = require('express');
const cors = require('cors');
const { notFoundHandler, errorHandler } = require('./common/errorHandler');
const { createMemberModule } = require('./member');
const { createPostModule } = require('./post');

/**
 * Express 앱을 만듭니다. 서버 실행(server.js)과 분리해 테스트에서 DB 없이 띄울 수 있게 합니다.
 * @param {{ pool?: import('mysql2/promise').Pool, memberRepository?: object, postRepository?: object, authenticate?: import('express').RequestHandler, corsOrigins: string[], bcryptRounds: number }} options
 */
function createApp({ pool, memberRepository, postRepository, authenticate, corsOrigins, bcryptRounds }) {
  const app = express();

  app.use(cors({ origin: corsOrigins }));
  app.use(express.json());
  // 로그인/JWT 구현 전까지는 req.memberId 를 채우는 미들웨어가 없어 🔒 API 는 401 입니다.
  if (authenticate) app.use(authenticate);

  const member = createMemberModule({ pool, memberRepository, bcryptRounds });
  app.use('/api/auth', member.router);

  const post = createPostModule({ pool, postRepository });
  app.use('/api/posts', post.router);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
