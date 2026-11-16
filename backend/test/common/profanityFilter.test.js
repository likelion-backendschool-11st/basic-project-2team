'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { containsProfanity } = require('../../src/common/profanityFilter');

describe('containsProfanity', () => {
  it('욕설과 기호를 끼워 넣은 우회·초성 욕설을 잡는다', () => {
    for (const text of ['이 시발 뭐야', '시.발', '시*발!!', 'ㅅㅂ 진짜', '개새끼', 'FUCK you', 'Sh1t'.replace('1', 'i')]) {
      assert.equal(containsProfanity(text), true, text);
    }
  });

  it('정상 글은 통과한다 (10시 발로란트, 빈 값 포함)', () => {
    for (const text of ['[카멘 1-3관] 숙련 서폿 모십니다', '오후 10시 발로란트 하실 분', '', undefined]) {
      assert.equal(containsProfanity(text), false, String(text));
    }
  });
});
