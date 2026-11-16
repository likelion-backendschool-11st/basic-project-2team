'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { processAvatar, AVATAR_SIZE } = require('../../src/account/avatarImage');

const make = (width, height, format) => sharp({ create: { width, height, channels: 3, background: '#4488ff' } })[format]().toBuffer();

describe('프로필 이미지 변환', () => {
  it('큰 직사각형 이미지를 256×256 WEBP 로 줄이고 용량도 줄인다', async () => {
    for (const format of ['png', 'jpeg']) {
      const input = await make(1600, 900, format);
      const { buffer, extension } = await processAvatar(input);
      const meta = await sharp(buffer).metadata();
      assert.deepEqual([extension, meta.format, meta.width, meta.height], ['webp', 'webp', AVATAR_SIZE, AVATAR_SIZE]);
      assert.ok(buffer.length < input.length);
    }
  });

  it('EXIF 회전을 적용하고 위치 정보 등 메타데이터를 남기지 않는다', async () => {
    const input = await sharp({ create: { width: 400, height: 100, channels: 3, background: '#fff' } }).jpeg().withExif({ IFD0: { Orientation: '6' } }).toBuffer();
    const { buffer } = await processAvatar(input);
    const meta = await sharp(buffer).metadata();
    assert.equal(meta.exif, undefined);
    assert.equal(meta.width, AVATAR_SIZE);
  });

  it('압축을 풀면 너무 큰 이미지(압축 폭탄)는 400 INVALID_IMAGE', async () => {
    // 5000×5000 단색 PNG 는 용량이 매우 작지만 풀면 2천 5백만 픽셀이라 한도(4096×4096)를 넘습니다.
    const bomb = await sharp({ create: { width: 5000, height: 5000, channels: 3, background: '#000' } }).png({ compressionLevel: 9 }).toBuffer();
    assert.ok(bomb.length < 2 * 1024 * 1024);
    await assert.rejects(processAvatar(bomb), (err) => err.status === 400 && err.code === 'INVALID_IMAGE');
  });

  it('이미지처럼 보이지만 읽을 수 없는 파일은 400 INVALID_IMAGE', async () => {
    const fake = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)]);
    await assert.rejects(processAvatar(fake), (err) => err.status === 400 && err.code === 'INVALID_IMAGE');
  });
});
