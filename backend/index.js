'use strict';

const { env } = require('./src/config/env');
const { pool } = require('./src/config/db');
const { createApp } = require('./src/app');

/** Vercel 진입 파일. 앱을 만들어 내보내기만 하고 listen 은 하지 않습니다 (로컬 실행은 src/server.js). */
module.exports = createApp({
    pool,
    corsOrigins: env.corsOrigins,
    bcryptRounds: env.bcryptRounds,
    auth: env.auth,
});
