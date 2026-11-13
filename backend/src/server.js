'use strict';

const { env } = require('./config/env');
const { pool } = require('./config/db');
const { createMailer } = require('./common/mailer');
const { createApp } = require('./app');

const app = createApp({
  pool,
  mailer: createMailer(env.mail),
  corsOrigins: env.corsOrigins,
  bcryptRounds: env.bcryptRounds,
  auth: env.auth,
});

app.listen(env.port, () => {
  console.log(`OurParty API listening on http://localhost:${env.port}`);
});
