'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { createR2AvatarStorage, createHybridAvatarStorage, createConfiguredAvatarStorage } = require('../../src/account/r2AvatarStorage');

/** send 로 받은 명령을 기록하는 가짜 S3 클라이언트 (실제 R2 에는 요청하지 않음) */
const fakeClient = () => {
  const sent = [];
  return { sent, send: async (command) => void sent.push(command) };
};
const BASE = 'https://cdn.example.com';
const FILE = /^1-[0-9a-f-]{36}\.png$/;

describe('R2 프로필 이미지 저장소', () => {
  it('접두어 아래에 {회원id}-{uuid}.{확장자} 로 올리고, 공개 주소를 돌려준다', async () => {
    const client = fakeClient();
    const storage = createR2AvatarStorage({ client, bucket: 'bkt', publicBaseUrl: `${BASE}/`, prefix: '/beggAvatars' });
    const url = await storage.save(1, Buffer.from('png-bytes'), 'png');

    assert.equal(client.sent.length, 1);
    const [put] = client.sent;
    assert.ok(put instanceof PutObjectCommand);
    assert.equal(put.input.Bucket, 'bkt');
    assert.match(put.input.Key, /^beggAvatars\/1-[0-9a-f-]{36}\.png$/);
    assert.equal(put.input.ContentType, 'image/png');
    assert.match(put.input.CacheControl, /immutable/);
    assert.equal(put.input.Body.toString(), 'png-bytes');
    assert.equal(url, `${BASE}/${put.input.Key}`);
  });

  it('확장자별 Content-Type 을 붙이고, 접두어가 없으면 버킷 맨 위에 둔다', async () => {
    const client = fakeClient();
    const storage = createR2AvatarStorage({ client, bucket: 'bkt', publicBaseUrl: BASE, prefix: '' });
    const url = await storage.save(7, Buffer.from('x'), 'jpg');
    assert.equal(client.sent[0].input.ContentType, 'image/jpeg');
    assert.match(client.sent[0].input.Key, /^7-[0-9a-f-]{36}\.jpg$/);
    assert.match(url, /^https:\/\/cdn\.example\.com\/7-/);
  });

  it('자기 주소만 지운다: 같은 접두어의 올바른 형식만 DeleteObject, 나머지는 아무것도 보내지 않는다', async () => {
    const client = fakeClient();
    const storage = createR2AvatarStorage({ client, bucket: 'bkt', publicBaseUrl: BASE, prefix: 'avatars/' });
    const url = await storage.save(1, Buffer.from('x'), 'png');
    client.sent.length = 0;

    await storage.remove(url);
    assert.equal(client.sent.length, 1);
    assert.ok(client.sent[0] instanceof DeleteObjectCommand);
    assert.match(client.sent[0].input.Key, /^avatars\/1-[0-9a-f-]{36}\.png$/);

    client.sent.length = 0;
    for (const other of [null, undefined, '', '/uploads/avatars/1-x.png', 'https://other.example.com/avatars/1-x.png', `${BASE}/avatars/../secret.png`, `${BASE}/other/1-${'a'.repeat(36)}.png`, `${BASE}/avatars/notmine.png`]) {
      await storage.remove(other);
    }
    assert.equal(client.sent.length, 0);
  });

  it('하이브리드: 저장은 R2, 삭제는 주소에 따라 R2 또는 로컬로 나눈다', async () => {
    const client = fakeClient();
    const calls = [];
    const local = { dir: '/tmp/avatars', save: async () => 'local', remove: async (url) => void calls.push(url) };
    const hybrid = createHybridAvatarStorage(local, createR2AvatarStorage({ client, bucket: 'bkt', publicBaseUrl: BASE, prefix: 'avatars/' }));

    assert.equal(hybrid.dir, '/tmp/avatars');
    const url = await hybrid.save(1, Buffer.from('x'), 'png');
    assert.match(url, new RegExp(`^${BASE}/avatars/`));
    await hybrid.remove(url);
    await hybrid.remove('/uploads/avatars/1-old.png');
    assert.deepEqual(calls, ['/uploads/avatars/1-old.png']);
    assert.equal(client.sent.filter((c) => c instanceof DeleteObjectCommand).length, 1);
  });

  it('환경 값이 하나라도 비면 로컬 저장소를, 모두 있으면 R2 저장소를 고른다', () => {
    const r2 = { accountId: 'acc', accessKeyId: 'k', secretAccessKey: 's', bucket: 'bkt', publicBaseUrl: BASE, avatarPrefix: 'avatars/' };
    const local = createConfiguredAvatarStorage({ uploadDir: '/tmp/up', r2: { ...r2, bucket: '' } });
    assert.equal(local.dir.replace(/\\/g, '/'), '/tmp/up/avatars');
    assert.equal(local.isOwnUrl, undefined);
    const hybrid = createConfiguredAvatarStorage({ uploadDir: '/tmp/up', r2 });
    assert.equal(hybrid.dir.replace(/\\/g, '/'), '/tmp/up/avatars');
    assert.notEqual(hybrid.save, local.save);
  });
});
