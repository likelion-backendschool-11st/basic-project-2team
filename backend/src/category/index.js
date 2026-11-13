'use strict';

const { Router } = require('express');
const { sendSuccess } = require('../common/response');
const { createCategoryRepository } = require('./categoryRepository');

/** GET /api/categories — 카테고리 목록 + 공고 수 (docs/API_SPEC.md 3절). 로직이 조회뿐이라 서비스 계층 없이 repository 를 바로 씁니다. */
function createCategoryModule({ pool, categoryRepository = createCategoryRepository(pool) }) {
  const router = Router();
  router.get('/', async (req, res) => sendSuccess(res, 200, await categoryRepository.findAllWithPostCount()));
  return { router };
}

module.exports = { createCategoryModule };
