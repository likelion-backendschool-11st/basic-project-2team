'use strict';

const { createAccountRepository } = require('./accountRepository');
const { createAccountService } = require('./accountService');
const { createAccountController } = require('./accountController');
const { createAccountRouter } = require('./accountRoutes');

/** repository → service → controller → router 를 조립합니다. 테스트에서는 repository 를 바꿔 끼웁니다. */
function createAccountModule({ pool, accountRepository = createAccountRepository(pool), requireAuth, bcryptRounds, now }) {
  const accountService = createAccountService({ accountRepository, bcryptRounds, now });
  const accountController = createAccountController(accountService);
  return { router: createAccountRouter(accountController, { requireAuth }) };
}

module.exports = { createAccountModule };
