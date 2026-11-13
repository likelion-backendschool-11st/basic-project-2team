'use strict';

const express = require('express');
const cors = require('cors');
const { env } = require('./config/env');
const { notFoundHandler, errorHandler } = require('./common/errorHandler');
const { createTokenProvider } = require('./common/tokenProvider');
const { createRequireAuth, createOptionalAuth, createRequireAdmin } = require('./common/authMiddleware');
const { modules } = require('./modules');

/**
 * Express 앱을 만듭니다. 서버 실행(server.js)과 분리해 테스트에서 DB 없이 띄울 수 있게 합니다.
 * 도메인 모듈은 modules.js 에서 가져오므로, 모듈이 늘어도 이 파일은 바꾸지 않습니다.
 * `xxxRepository` 옵션(예: memberRepository)은 이름 그대로 해당 모듈에 전달돼 테스트에서 DB 대신 쓰입니다.
 * @param {{
 *   pool?: import('mysql2/promise').Pool,
 *   corsOrigins: string[],
 *   bcryptRounds: number,
 *   auth?: typeof env.auth,
 *   now?: () => Date,
 * } & Record<string, unknown>} options
 */
function createApp({ pool, corsOrigins, bcryptRounds, auth = env.auth, now, ...repositories }) {
  const app = express();

  app.use(cors({ origin: corsOrigins }));
  app.use(express.json());

  const tokenProvider = createTokenProvider(auth);
  const deps = {
    ...repositories,
    pool,
    bcryptRounds,
    now,
    tokenProvider,
    requireAuth: createRequireAuth(tokenProvider),
    optionalAuth: createOptionalAuth(tokenProvider),
    requireAdmin: createRequireAdmin(tokenProvider),
  };

  for (const { path, create } of modules) app.use(path, create(deps).router);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
