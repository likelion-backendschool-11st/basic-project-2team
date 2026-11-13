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

module.exports = { pool };
