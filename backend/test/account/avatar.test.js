'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const { createApp } = require('../../src/app');
const { createTokenProvider } = require('../../src/common/tokenProvider');
const { createAvatarStorage } = require('../../src/account/avatarStorage');

const AUTH = Object.freeze({
  jwtSecret: 'test-secret',
  accessTokenTtlSeconds: 1800,
  refreshTokenTtlDays: 1,
  rememberMeTtlDays: 14,
});
const PASSWORD = 'abc123!@';
const ME = 1;

/** 최소한의 이미지 바이트 (형식 판별은 앞부분 시그니처만 봅니다) */
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32, 2)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(32, 3)]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

/** DB 대신 메모리에 저장하는 가짜 repository (프로필 이미지·탈퇴에 쓰는 메서드만) */
function createFakeRepository() {
  const state = {};
  return {
    state,
    reset(passwordHash) {
      state.member = { id: ME, passwordHash, nickname: '빛나는힐러', email: null, phone: null, avatarUrl: null, status: 'ACTIVE' };
    },
    async findAccount(memberId) {
      return memberId === ME ? { ...state.member } : null;
    },
    async updateAvatar(memberId, avatarUrl) {
      if (state.member.status === 'WITHDRAWN') return false;
      state.member.avatarUrl = avatarUrl;
      return true;
    },
    async countActiveParties() {
      return { hosting: 0, joined: 0 };
    },
    async findSanctionTypes() {
      return [];
    },
    async withdraw() {
      Object.assign(state.member, { status: 'WITHDRAWN', avatarUrl: null });
      return true;
    },
  };
}

describe('프로필 이미지 API (/api/members/me/avatar)', () => {
  let server;
  let baseUrl;
  let dir;
  let passwordHash;
  const repo = createFakeRepository();
  const tokens = createTokenProvider(AUTH);

  before(async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 4);
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ourparty-avatar-'));
    const app = createApp({
      accountRepository: repo,
      avatarStorage: createAvatarStorage(dir),
      // 이 파일의 테스트는 가짜 이미지 바이트를 쓰므로 변환은 건너뜁니다 (변환은 avatarImage.test.js 에서 검증).
      avatarProcessor: async (buffer, extension) => ({ buffer, extension }),
      corsOrigins: [],
      bcryptRounds: 4,
      auth: AUTH,
    });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://localhost:${server.address().port}`;
  });
  after(() => {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
  beforeEach(() => {
    repo.reset(passwordHash);
    for (const file of fs.readdirSync(dir)) fs.rmSync(path.join(dir, file));
  });

  const auth = () => ({ Authorization: `Bearer ${tokens.createAccessToken(ME)}` });
  const upload = (body, contentType = 'image/png', headers = auth()) =>
    fetch(`${baseUrl}/api/members/me/avatar`, { method: 'PUT', headers: { 'Content-Type': contentType, ...headers }, body });
  const files = () => fs.readdirSync(dir);

  it('이미지를 저장하고 공개 주소를 돌려주며, 그 주소로 같은 파일을 내려준다', async () => {
    const res = await upload(PNG);
    assert.equal(res.status, 200);
    const { data } = await res.json();
    assert.match(data.avatarUrl, /^\/uploads\/avatars\/1-[0-9a-f-]{36}\.png$/);
    assert.equal(repo.state.member.avatarUrl, data.avatarUrl);
    assert.equal(files().length, 1);

    const image = await fetch(`${baseUrl}${data.avatarUrl}`);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get('x-content-type-options'), 'nosniff');
    assert.deepEqual(Buffer.from(await image.arrayBuffer()), PNG);
  });

  it('Content-Type 이 아니라 파일 내용으로 확장자를 정한다 (JPG·WEBP)', async () => {
    const jpg = await (await upload(JPG, 'image/png')).json();
    assert.match(jpg.data.avatarUrl, /\.jpg$/);
    const webp = await (await upload(WEBP, 'image/webp')).json();
    assert.match(webp.data.avatarUrl, /\.webp$/);
  });

  it('새 이미지로 바꾸면 이전 이미지 파일을 지운다', async () => {
    const first = (await (await upload(PNG)).json()).data.avatarUrl;
    const second = (await (await upload(JPG, 'image/jpeg')).json()).data.avatarUrl;
    assert.notEqual(first, second);
    assert.deepEqual(files(), [path.basename(second)]);
    assert.equal((await fetch(`${baseUrl}${first}`)).status, 404);
  });

  it('이미지가 아닌 파일(SVG 포함)이나 빈 본문, 다른 Content-Type 은 400 INVALID_IMAGE', async () => {
    for (const [body, type] of [
      [SVG, 'image/png'],
      [Buffer.alloc(0), 'image/png'],
      [PNG, 'application/octet-stream'],
      [PNG, 'image/svg+xml'],
    ]) {
      const res = await upload(body, type);
      assert.equal(res.status, 400, type);
      assert.equal((await res.json()).error.code, 'INVALID_IMAGE');
    }
    assert.equal(files().length, 0);
    assert.equal(repo.state.member.avatarUrl, null);
  });

  it('2MB 를 넘으면 413', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]);
    const res = await upload(big);
    assert.equal(res.status, 413);
    assert.equal(files().length, 0);
  });

  it('로그인하지 않았으면 401', async () => {
    assert.equal((await upload(PNG, 'image/png', {})).status, 401);
  });

  it('DELETE 하면 기본 이미지(null)로 되돌리고 파일을 지운다. 이미 기본이면 그대로 204', async () => {
    await upload(PNG);
    const res = await fetch(`${baseUrl}/api/members/me/avatar`, { method: 'DELETE', headers: auth() });
    assert.equal(res.status, 204);
    assert.equal(repo.state.member.avatarUrl, null);
    assert.equal(files().length, 0);

    const again = await fetch(`${baseUrl}/api/members/me/avatar`, { method: 'DELETE', headers: auth() });
    assert.equal(again.status, 204);
  });

  it('회원 탈퇴하면 프로필 이미지 파일도 지운다', async () => {
    await upload(PNG);
    const res = await fetch(`${baseUrl}/api/members/me`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...auth() },
      body: JSON.stringify({ password: PASSWORD }),
    });
    assert.equal(res.status, 204);
    assert.equal(files().length, 0);
  });

  it('저장소 밖 경로나 다른 형식의 주소는 지우지 않는다', async () => {
    const storage = createAvatarStorage(dir);
    const outside = path.join(dir, '..', 'keep-me.txt');
    fs.writeFileSync(outside, 'x');
    await storage.remove('/uploads/avatars/../keep-me.txt');
    await storage.remove('https://example.com/a.png');
    assert.equal(fs.existsSync(outside), true);
    fs.rmSync(outside);
  });
});
