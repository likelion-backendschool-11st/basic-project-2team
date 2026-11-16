'use strict';

const path = require('node:path');

/** Reads process.env once and exposes typed config values with local-dev defaults. */
const env = Object.freeze({
  port: Number(process.env.PORT ?? 8080),
  /** 업로드한 파일(프로필 이미지 등)을 저장할 폴더. 기본값은 backend/uploads (git 에 올리지 않음) */
  uploadDir: path.resolve(process.env.UPLOAD_DIR ?? path.join(__dirname, '..', '..', 'uploads')),
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
  /**
   * Cloudflare R2(프로필 이미지 저장). 아래 다섯 값이 모두 있어야 켜지고, 하나라도 없으면 로컬 폴더(uploadDir)에 저장합니다.
   * 접근 키는 서버(.env)에만 두고 프론트·git 에 올리지 않습니다.
   */
  r2: Object.freeze({
    accountId: process.env.R2_ACCOUNT_ID ?? '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    bucket: process.env.R2_BUCKET ?? '',
    /** 브라우저가 이미지를 불러올 공개 주소 (커스텀 도메인 또는 r2.dev). 끝의 `/` 는 없어도 됩니다. */
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL ?? '',
    /** 버킷 안에서 프로필 이미지를 모아 둘 폴더(키 접두어) */
    avatarPrefix: process.env.R2_AVATAR_PREFIX ?? 'avatars/',
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

const r2Values = [env.r2.accountId, env.r2.accessKeyId, env.r2.secretAccessKey, env.r2.bucket, env.r2.publicBaseUrl];
if (r2Values.some(Boolean) && !r2Values.every(Boolean)) {
  console.warn('R2_* 환경 변수가 일부만 설정되어 있어 R2 를 쓰지 않고 로컬 폴더에 저장합니다.');
}

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET 환경 변수를 설정해야 합니다.');
}

module.exports = { env };
