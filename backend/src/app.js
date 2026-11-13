'use strict';

const express = require('express');
const cors = require('cors');
const { notFoundHandler, errorHandler } = require('./common/errorHandler');
const { createMemberModule } = require('./member');

/**
 * Express 앱을 만듭니다. 서버 실행(server.js)과 분리해 테스트에서 DB 없이 띄울 수 있게 합니다.
 * @param {{ pool?: import('mysql2/promise').Pool, memberRepository?: object, corsOrigins: string[], bcryptRounds: number }} options
 */
function createApp({ pool, memberRepository, corsOrigins, bcryptRounds }) {
  const app = express();

  app.use(cors({ origin: corsOrigins }));
  app.use(express.json());

  const member = createMemberModule({ pool, memberRepository, bcryptRounds });
  app.use('/api/auth', member.router);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
