'use strict';

const { PLAY_STYLES } = require('../post/postConstants');

/** 프로필 수정 입력 규칙 (docs/03-db-design.md member, member_game_profile) */
const BIO_MAX_LENGTH = 200;
const AGE_RANGE_MAX_LENGTH = 10;
/** 선호 게임은 최대 N개 (프로필 수정 화면의 복수 선택) */
const MAX_PROFILE_GAMES = 10;
/** game.code 형식 */
const GAME_CODE_PATTERN = /^[a-z0-9_-]{1,30}$/;
/** 플레이 스타일은 공고와 같은 값을 씁니다. */
const PROFILE_PLAY_STYLES = PLAY_STYLES;

/** 탈퇴 사유 (member_withdrawal.reason) */
const WITHDRAW_REASON_MAX_LENGTH = 200;

/**
 * 탈퇴자 보관·재가입 제한 (docs/03-db-design.md 6절 결정 사항 10·11)
 * - 제재 이력 없음: 재가입 제한 없음, 30일 뒤 파기
 * - 경고·기간 정지 이력: 탈퇴 후 6개월 재가입 제한, 제한이 끝나면 파기
 * - 영구 정지(BAN) 이력: 영구 재가입 제한
 */
const WITHDRAWAL_PURGE_DAYS = 30;
const SANCTION_REJOIN_BLOCK_MONTHS = 6;
const PERMANENT_BLOCK_UNTIL = new Date('9999-12-31T00:00:00Z');
const SANCTION_TYPES = Object.freeze({ warning: 'WARNING', suspend: 'SUSPEND', ban: 'BAN' });

const accountMessages = Object.freeze({
  invalidInput: '입력값을 확인해주세요.',
  unauthorized: '로그인이 필요합니다.',
  bioInvalid: `소개는 ${BIO_MAX_LENGTH}자 이하로 입력해주세요.`,
  ageRangeInvalid: `나이대는 ${AGE_RANGE_MAX_LENGTH}자 이하로 입력해주세요.`,
  ageRangePublicInvalid: 'ageRangePublic 은 true 또는 false 여야 합니다.',
  gamesInvalid: `선호 게임은 게임 코드 배열(최대 ${MAX_PROFILE_GAMES}개)이어야 합니다.`,
  gameNotFound: '존재하지 않는 게임이 포함되어 있습니다.',
  mainGameInvalid: '대표 게임은 선호 게임 중 하나여야 합니다.',
  playStyleInvalid: `플레이 스타일은 ${PROFILE_PLAY_STYLES.join(', ')} 중 하나여야 합니다.`,
  currentPasswordRequired: '현재 비밀번호를 입력해주세요.',
  invalidPassword: '비밀번호가 일치하지 않습니다.',
  samePassword: '현재 비밀번호와 다른 비밀번호를 입력해주세요.',
  reasonInvalid: `탈퇴 사유는 ${WITHDRAW_REASON_MAX_LENGTH}자 이하로 입력해주세요.`,
  activePartyExists: '진행 중인 파티가 있어 탈퇴할 수 없습니다. 모집 중인 공고를 마감·완료하거나 참여 중인 파티를 정리한 뒤 다시 시도해주세요.',
});

module.exports = {
  BIO_MAX_LENGTH,
  AGE_RANGE_MAX_LENGTH,
  MAX_PROFILE_GAMES,
  GAME_CODE_PATTERN,
  PROFILE_PLAY_STYLES,
  WITHDRAW_REASON_MAX_LENGTH,
  WITHDRAWAL_PURGE_DAYS,
  SANCTION_REJOIN_BLOCK_MONTHS,
  PERMANENT_BLOCK_UNTIL,
  SANCTION_TYPES,
  accountMessages,
};
