'use strict';

const { createEmailVerificationRepository } = require('./emailVerificationRepository');
const { createEmailVerificationService } = require('./emailVerificationService');
const { createEmailVerificationController } = require('./emailVerificationController');
const { createEmailVerificationRouter } = require('./emailVerificationRoutes');

/** repository → service → controller → router 를 조립합니다. 테스트에서는 repository 와 mailer 를 바꿔 끼웁니다. */
function createEmailVerificationModule({
  pool,
  emailVerificationRepository = createEmailVerificationRepository(pool),
  tokenProvider,
  mailer,
  now,
}) {
  const emailVerificationService = createEmailVerificationService({
    emailVerificationRepository,
    tokenProvider,
    mailer,
    now,
  });
  const emailVerificationController = createEmailVerificationController(emailVerificationService);
  return { router: createEmailVerificationRouter(emailVerificationController) };
}

module.exports = { createEmailVerificationModule };
