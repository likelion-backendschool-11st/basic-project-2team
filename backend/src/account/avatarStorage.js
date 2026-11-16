'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { AVATAR_URL_PREFIX } = require('./accountConstants');

/** 저장한 파일 이름 형식: `{memberId}-{uuid}.{ext}`. 이 형식만 지우므로 경로를 벗어난 파일은 건드리지 않습니다. */
const STORED_FILE_NAME = /^\d+-[0-9a-f-]{36}\.(png|jpg|gif|webp)$/;

/**
 * 프로필 이미지 파일을 디스크(dir)에 저장·삭제합니다. 공개 주소는 AVATAR_URL_PREFIX + 파일 이름입니다.
 * 테스트에서는 임시 폴더로 만들어 바꿔 끼웁니다.
 * @param {string} dir
 */
function createAvatarStorage(dir) {
  /** @returns {Promise<string>} 공개 주소 (예: /uploads/avatars/1-….png) */
  async function save(memberId, buffer, extension) {
    await fs.mkdir(dir, { recursive: true });
    const fileName = `${memberId}-${crypto.randomUUID()}.${extension}`;
    await fs.writeFile(path.join(dir, fileName), buffer);
    return `${AVATAR_URL_PREFIX}${fileName}`;
  }

  /** 이 저장소가 만든 파일만 지웁니다. 다른 형식의 주소(외부 URL 등)이거나 파일이 없으면 아무것도 하지 않습니다. */
  async function remove(avatarUrl) {
    if (typeof avatarUrl !== 'string' || !avatarUrl.startsWith(AVATAR_URL_PREFIX)) return;
    const fileName = avatarUrl.slice(AVATAR_URL_PREFIX.length);
    if (!STORED_FILE_NAME.test(fileName)) return;
    await fs.rm(path.join(dir, fileName), { force: true });
  }

  return { dir, save, remove };
}

module.exports = { createAvatarStorage };
