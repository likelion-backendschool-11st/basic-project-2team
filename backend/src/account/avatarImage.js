'use strict';

const sharp = require('sharp');
const { ApiError } = require('../common/ApiError');
const { accountMessages } = require('./accountConstants');

/** 프로필 이미지는 정사각형 이 크기(px)로 줄여 저장합니다. 화면에는 작은 원·사각형으로만 쓰입니다. */
const AVATAR_SIZE = 256;
const AVATAR_QUALITY = 80;
/** 압축을 푼 뒤 이 픽셀 수(4096×4096)를 넘는 이미지는 받지 않습니다. 용량은 작아도 풀면 거대한 이미지(압축 폭탄)로 메모리를 쓰는 것을 막습니다. */
const MAX_INPUT_PIXELS = 4096 * 4096;

/**
 * 업로드한 이미지를 256×256(가운데 기준 잘라내기) WEBP 로 바꿉니다. EXIF 회전을 적용하고 메타데이터(위치 정보 등)는 버리며,
 * 움직이는 GIF 는 첫 장만 씁니다. 시그니처만 이미지처럼 보이고 실제로 읽을 수 없는 파일은 400 INVALID_IMAGE 입니다.
 * @returns {Promise<{ buffer: Buffer, extension: 'webp' }>}
 */
async function processAvatar(buffer) {
  try {
    const out = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, pages: 1, failOn: 'error' }).rotate().resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover' }).webp({ quality: AVATAR_QUALITY }).toBuffer();
    return { buffer: out, extension: 'webp' };
  } catch {
    throw new ApiError(400, 'INVALID_IMAGE', accountMessages.avatarInvalid);
  }
}

module.exports = { processAvatar, AVATAR_SIZE };
