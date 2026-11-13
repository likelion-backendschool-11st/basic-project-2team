'use strict';

const { createPartyRepository } = require('./partyRepository');
const { createPartyService } = require('./partyService');
const { createPartyController } = require('./partyController');
const { createPartyRouter } = require('./partyRoutes');

/** repository → service → controller → router 를 조립합니다. 테스트에서는 repository 를 바꿔 끼웁니다. */
function createPartyModule({ pool, partyRepository = createPartyRepository(pool), requireAuth, now }) {
  const partyService = createPartyService({ partyRepository, now });
  const partyController = createPartyController(partyService);
  return { router: createPartyRouter(partyController, { requireAuth }) };
}

module.exports = { createPartyModule };
