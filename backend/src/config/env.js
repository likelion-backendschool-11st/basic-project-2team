'use strict';

/** Reads process.env once and exposes typed config values with local-dev defaults. */
const env = Object.freeze({
  port: Number(process.env.PORT ?? 8080),
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  db: Object.freeze({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'begg',
    password: process.env.DB_PASSWORD ?? 'begg',
    database: process.env.DB_NAME ?? 'beggdb',
  }),
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 10),
  auth: Object.freeze({
    /** JWT 서명 키. 운영 환경에서는 반드시 길고 무작위한 값으로 지정합니다. */
    jwtSecret: process.env.JWT_SECRET ?? 'ourparty-local-dev-secret',
    /** Access Token 유효 시간(초) */
    accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 7200),
    /** Refresh Token 유효 기간(일) — 로그인 상태 유지 미선택 */
    refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 1),
    /** Refresh Token 유효 기간(일) — 로그인 상태 유지 선택 */
    rememberMeTtlDays: Number(process.env.REMEMBER_ME_TTL_DAYS ?? 14),
  }),
});

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET 환경 변수를 설정해야 합니다.');
}

module.exports = { env };
