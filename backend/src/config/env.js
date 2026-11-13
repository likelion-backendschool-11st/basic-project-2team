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
});

module.exports = { env };
