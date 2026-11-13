'use strict';

const mysql = require('mysql2/promise');
const { env } = require('./env');

/** Shared connection pool. DATETIME 값은 UTC로 읽고 씁니다 (docs/03-db-design.md 0절). */
const pool = mysql.createPool({
  ...env.db,
  timezone: 'Z',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
});

/**
 * DEFAULT CURRENT_TIMESTAMP 컬럼(created_at · updated_at)도 UTC 로 저장되도록 세션 시간대를 맞춥니다.
 * 이 설정이 없으면 MySQL 서버 시간대(예: KST)로 저장된 값을 UTC 로 읽어 9시간 어긋납니다.
 */
pool.pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+00:00'");
});

module.exports = { pool };
