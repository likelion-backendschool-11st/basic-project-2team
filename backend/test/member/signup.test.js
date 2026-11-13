'use strict';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { createApp } = require('../../src/app');

/** DB 대신 메모리에 저장하는 가짜 repository */
function createFakeRepository() {
  const state = { members: [], agreements: [], withdrawals: [] };
  return {
    state,
    async existsBy(column, value) {
      return state.members.some((m) => m[column] === value);
    },
    async hasActiveRejoinBlock({ phoneHash, emailHash, now }) {
      return state.withdrawals.some(
        (w) => (w.phoneHash === phoneHash || w.emailHash === emailHash) && w.blockedUntil > now,
      );
    },
    async createMember({ member, agreements, termsVersion }) {
      const id = state.members.length + 1;
      state.members.push({
        id,
        login_id: member.userId,
        nickname: member.nickname,
        email: member.email,
        phone: member.phone,
        name: member.name,
        password_hash: member.passwordHash,
      });
      for (const [key, agreed] of Object.entries(agreements)) state.agreements.push({ id, key, agreed, termsVersion });
      return id;
    },
  };
}

const validBody = () => ({
  name: '홍길동',
  phone: '010-1234-5678',
  address: '서울시 어딘가',
  userId: 'healer01',
  nickname: '빛나는힐러',
  password: 'abc123!@',
  email: 'User@Example.com',
  agreements: { terms: true, privacy: true, marketing: false },
});

describe('member signup API', () => {
  let server;
  let baseUrl;
  let repo;

  before(async () => {
    repo = createFakeRepository();
    // 매 테스트에서 repo 상태만 비우고 같은 객체를 재사용
    const app = createApp({ memberRepository: repo, corsOrigins: ['http://localhost:5173'], bcryptRounds: 4 });
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(() => new Promise((resolve) => server.close(resolve)));

  beforeEach(() => {
    repo.state.members.length = 0;
    repo.state.agreements.length = 0;
    repo.state.withdrawals.length = 0;
  });

  const post = (body) =>
    fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });

  const check = (type, value) =>
    fetch(`${baseUrl}/api/auth/check?${new URLSearchParams({ type, value })}`);

  it('가입에 성공하면 201 과 회원 정보를 반환하고 정규화된 값을 저장한다', async () => {
    const res = await post(validBody());
    assert.equal(res.status, 201);
    assert.deepEqual(await res.json(), {
      success: true,
      data: { id: 1, userId: 'healer01', nickname: '빛나는힐러' },
    });

    const [saved] = repo.state.members;
    assert.equal(saved.email, 'user@example.com');
    assert.equal(saved.phone, '01012345678');
    assert.ok(await bcrypt.compare('abc123!@', saved.password_hash));
    assert.deepEqual(
      repo.state.agreements.map((a) => [a.key, a.agreed]),
      [['terms', true], ['privacy', true], ['marketing', false]],
    );
  });

  it('marketing 동의를 생략하면 false 로 저장하고 name 이 비면 null 로 저장한다', async () => {
    const res = await post({ ...validBody(), name: '  ', agreements: { terms: true, privacy: true } });
    assert.equal(res.status, 201);
    assert.equal(repo.state.members[0].name, null);
    assert.equal(repo.state.agreements.find((a) => a.key === 'marketing').agreed, false);
  });

  it('형식이 틀린 필드를 모두 모아 400 INVALID_INPUT 으로 응답한다', async () => {
    const res = await post({
      ...validBody(),
      userId: 'Ab',
      nickname: '닉',
      password: 'abcdefgh',
      email: 'not-an-email',
      phone: '02-123-4567',
    });
    assert.equal(res.status, 400);
    const { success, error } = await res.json();
    assert.equal(success, false);
    assert.equal(error.code, 'INVALID_INPUT');
    assert.deepEqual(
      error.fields.map((f) => f.field).sort(),
      ['email', 'nickname', 'password', 'phone', 'userId'],
    );
  });

  it('허용하지 않은 특수문자나 길이를 넘는 비밀번호는 거부한다', async () => {
    for (const password of ['abc123$%', 'abc123!@abc12', 'abcdefg!', '1234567!']) {
      const res = await post({ ...validBody(), password });
      assert.equal(res.status, 400, password);
    }
  });

  it('필수 약관에 동의하지 않으면 400 REQUIRED_TERMS_NOT_AGREED', async () => {
    const res = await post({ ...validBody(), agreements: { terms: true, privacy: false } });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, 'REQUIRED_TERMS_NOT_AGREED');
  });

  it('agreements 가 없거나 boolean 이 아니면 400', async () => {
    const res = await post({ ...validBody(), agreements: { terms: 'yes', privacy: true } });
    assert.equal(res.status, 400);
    const { error } = await res.json();
    assert.equal(error.fields[0].field, 'agreements');
  });

  it('아이디·닉네임·이메일·휴대폰이 중복되면 각각 409 로 응답한다', async () => {
    await post(validBody());
    const cases = [
      [{ userId: 'healer01' }, 'DUPLICATE_LOGIN_ID'],
      [{ nickname: '빛나는힐러' }, 'DUPLICATE_NICKNAME'],
      [{ email: 'USER@example.com' }, 'DUPLICATE_EMAIL'],
      [{ phone: '01012345678' }, 'DUPLICATE_PHONE'],
    ];
    const unique = { userId: 'other02', nickname: '다른닉네임', email: 'other@example.com', phone: '010-9999-8888' };
    for (const [override, code] of cases) {
      const res = await post({ ...validBody(), ...unique, ...override });
      assert.equal(res.status, 409, code);
      assert.equal((await res.json()).error.code, code);
    }
    assert.equal(repo.state.members.length, 1);
  });

  it('재가입 제한 기간이 남은 휴대폰/이메일이면 403 REJOIN_RESTRICTED', async () => {
    const hash = (v) => crypto.createHash('sha256').update(v).digest('hex');
    repo.state.withdrawals.push({
      phoneHash: hash('01012345678'),
      emailHash: hash('someone@else.com'),
      blockedUntil: new Date(Date.now() + 86_400_000),
    });
    const res = await post(validBody());
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error.code, 'REJOIN_RESTRICTED');
  });

  it('잘못된 JSON 본문은 400 INVALID_JSON', async () => {
    const res = await post('{ broken');
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, 'INVALID_JSON');
  });

  it('중복 확인: 사용 중이면 available=false, 아니면 true', async () => {
    await post(validBody());
    const taken = await check('userId', 'healer01');
    assert.equal(taken.status, 200);
    assert.deepEqual(await taken.json(), { success: true, data: { available: false } });

    const takenEmail = await check('email', ' USER@example.com ');
    assert.equal((await takenEmail.json()).data.available, false);

    const free = await check('nickname', '새닉네임');
    assert.deepEqual(await free.json(), { success: true, data: { available: true } });
  });

  it('중복 확인: 알 수 없는 type, 빈 값, 형식 오류는 400', async () => {
    for (const [type, value] of [['phone', '01012345678'], ['userId', ''], ['userId', 'UPPER']]) {
      const res = await check(type, value);
      assert.equal(res.status, 400, `${type}=${value}`);
      assert.equal((await res.json()).error.code, 'INVALID_INPUT');
    }
  });

  it('없는 경로는 404 NOT_FOUND', async () => {
    const res = await fetch(`${baseUrl}/api/unknown`);
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error.code, 'NOT_FOUND');
  });
});
