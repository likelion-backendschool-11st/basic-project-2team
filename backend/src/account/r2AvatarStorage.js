'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const { createAvatarStorage } = require('./avatarStorage');

/** 저장한 파일 이름 형식: `{memberId}-{uuid}.{ext}` (로컬 저장소와 같음). 이 형식만 지우므로 다른 파일은 건드리지 않습니다. */
const STORED_FILE_NAME = /^\d+-[0-9a-f-]{36}\.(png|jpg|gif|webp)$/;
const CONTENT_TYPES = Object.freeze({ png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' });
/** 파일 이름에 uuid 가 들어 있어 내용이 바뀌지 않으므로 오래 캐시해도 됩니다. */
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

/** 앞의 `/` 를 없애고 끝에 `/` 를 하나 붙입니다. 비어 있으면 버킷 맨 위(접두어 없음). */
const normalizePrefix = (prefix) => {
  const trimmed = String(prefix ?? '').replace(/^\/+|\/+$/g, '');
  return trimmed ? `${trimmed}/` : '';
};

/**
 * Cloudflare R2(S3 호환)에 프로필 이미지를 저장·삭제합니다. 공개 주소는 `{publicBaseUrl}/{prefix}{파일 이름}` 입니다.
 * `client` 는 `@aws-sdk/client-s3` 의 S3Client 와 같이 `send(command)` 를 가진 객체이고, 테스트에서는 가짜로 바꿔 끼웁니다.
 * @param {{ client: { send: (command: unknown) => Promise<unknown> }, bucket: string, publicBaseUrl: string, prefix?: string }} options
 */
function createR2AvatarStorage({ client, bucket, publicBaseUrl, prefix = 'avatars/' }) {
  const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
  const keyPrefix = normalizePrefix(prefix);
  const baseUrl = publicBaseUrl.replace(/\/+$/, '');
  const urlPrefix = `${baseUrl}/${keyPrefix}`;

  /** @returns {Promise<string>} 공개 주소 (예: https://cdn.example.com/avatars/1-….png) */
  async function save(memberId, buffer, extension) {
    const fileName = `${memberId}-${crypto.randomUUID()}.${extension}`;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: `${keyPrefix}${fileName}`,
        Body: buffer,
        ContentType: CONTENT_TYPES[extension],
        CacheControl: CACHE_CONTROL,
      }),
    );
    return `${urlPrefix}${fileName}`;
  }

  /** 이 저장소가 만든 주소만 지웁니다 (다른 형식의 주소·로컬 파일 주소면 아무것도 하지 않음). */
  async function remove(avatarUrl) {
    if (!isOwnUrl(avatarUrl)) return;
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: `${keyPrefix}${avatarUrl.slice(urlPrefix.length)}` }));
  }

  function isOwnUrl(avatarUrl) {
    return typeof avatarUrl === 'string' && avatarUrl.startsWith(urlPrefix) && STORED_FILE_NAME.test(avatarUrl.slice(urlPrefix.length));
  }

  return { save, remove, isOwnUrl };
}

/**
 * 새 이미지는 R2 에 저장하고, 이미 로컬 폴더에 올라가 있던 이전 이미지(/uploads/avatars/…)는 그대로 로컬에서 서빙·삭제합니다.
 * @param {{ dir: string, save: Function, remove: Function }} local createAvatarStorage 로 만든 로컬 저장소
 * @param {{ save: Function, remove: Function, isOwnUrl: (url: unknown) => boolean }} remote createR2AvatarStorage 로 만든 R2 저장소
 */
function createHybridAvatarStorage(local, remote) {
  return {
    dir: local.dir,
    save: remote.save,
    remove: (avatarUrl) => (remote.isOwnUrl(avatarUrl) ? remote.remove(avatarUrl) : local.remove(avatarUrl)),
  };
}

/**
 * 환경 설정(env)에 따라 프로필 이미지 저장소를 고릅니다. R2 값이 모두 있으면 R2(+기존 로컬 파일 호환), 아니면 로컬 폴더입니다.
 * @param {{ uploadDir: string, r2: { accountId: string, accessKeyId: string, secretAccessKey: string, bucket: string, publicBaseUrl: string, avatarPrefix: string } }} config
 */
function createConfiguredAvatarStorage(config) {
  const local = createAvatarStorage(path.join(config.uploadDir, 'avatars'));
  const { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl, avatarPrefix } = config.r2;
  if (![accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl].every(Boolean)) return local;
  const { S3Client } = require('@aws-sdk/client-s3');
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return createHybridAvatarStorage(local, createR2AvatarStorage({ client, bucket, publicBaseUrl, prefix: avatarPrefix }));
}

module.exports = { createR2AvatarStorage, createHybridAvatarStorage, createConfiguredAvatarStorage };
