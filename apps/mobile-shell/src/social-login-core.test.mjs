import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createKakaoLogin, isKakaoCancelled } from './social-login-core.ts';

const setup = (overrides = {}) => {
  const calls = { initialize: [], login: [] };
  let counter = 0;
  const kakaoLogin = createKakaoLogin({
    appKey: 'native-key',
    initialize: (appKey) => {
      calls.initialize.push(appKey);
      return Promise.resolve();
    },
    login: (options) => {
      calls.login.push(options);
      return Promise.resolve({ idToken: 'id-token' });
    },
    randomNonce: () => `nonce-${(counter += 1)}`,
    ...overrides,
  });
  return { kakaoLogin, calls };
};

test('성공하면 ID 토큰과 로그인 요청에 쓴 nonce를 함께 돌려준다', async () => {
  const { kakaoLogin, calls } = setup();

  const result = await kakaoLogin();

  assert.deepEqual(result, {
    status: 'success',
    provider: 'kakao',
    idToken: 'id-token',
    nonce: 'nonce-1',
  });
  assert.deepEqual(calls.login, [{ nonce: 'nonce-1' }]);
});

test('SDK는 처음 한 번만 앱 키로 시작하고 nonce는 로그인마다 새로 만든다', async () => {
  const { kakaoLogin, calls } = setup();

  const first = await kakaoLogin();
  const second = await kakaoLogin();

  assert.deepEqual(calls.initialize, ['native-key']);
  assert.notEqual(first.nonce, second.nonce);
});

test('사용자가 로그인 창을 닫거나 동의를 거절하면 실패가 아닌 취소로 돌려준다', async () => {
  for (const code of ['Cancelled', 'AccessDenied']) {
    const { kakaoLogin } = setup({
      login: () => Promise.reject(Object.assign(new Error('native detail'), { code })),
    });

    assert.deepEqual(await kakaoLogin(), { status: 'cancelled' });
  }
});

test('그 밖의 SDK 오류는 원문 없이 일반 문구로 던진다(토큰·내부 정보가 새지 않게)', async () => {
  const { kakaoLogin } = setup({
    login: () =>
      Promise.reject(Object.assign(new Error('secret-token-xyz'), { code: 'NetworkError' })),
  });

  await assert.rejects(kakaoLogin, (error) => {
    assert.equal(error.message, '카카오 로그인에 실패했어요.');
    assert.ok(!error.message.includes('secret-token-xyz'));
    return true;
  });
});

test('ID 토큰이 오지 않으면 OpenID Connect 확인 안내와 함께 던진다', async () => {
  const { kakaoLogin } = setup({ login: () => Promise.resolve({}) });

  await assert.rejects(kakaoLogin, /OpenID Connect/);
});

test('앱 키가 없으면 SDK를 시작하지 않고 설정 안내와 함께 던진다', async () => {
  const { kakaoLogin, calls } = setup({ appKey: undefined });

  await assert.rejects(kakaoLogin, /EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY/);
  assert.deepEqual(calls.initialize, []);
});

test('SDK 시작에 실패하면 일반 문구로 던지고 다음 호출에서 다시 시작한다', async () => {
  let attempts = 0;
  const { kakaoLogin } = setup({
    initialize: () => {
      attempts += 1;
      return attempts === 1 ? Promise.reject(new Error('init detail')) : Promise.resolve();
    },
  });

  await assert.rejects(kakaoLogin, /카카오 SDK를 시작하지 못했어요/);
  const retry = await kakaoLogin();

  assert.equal(retry.status, 'success');
  assert.equal(attempts, 2);
});

test('로그인이 진행 중일 때 다시 호출해도 로그인 창을 한 번만 띄운다', async () => {
  const { kakaoLogin, calls } = setup();

  const [first, second] = await Promise.all([kakaoLogin(), kakaoLogin()]);

  assert.equal(calls.login.length, 1);
  assert.deepEqual(first, second);
});

test('취소 판별은 오류 코드만 본다', () => {
  assert.equal(isKakaoCancelled({ code: 'Cancelled' }), true);
  assert.equal(isKakaoCancelled({ code: 'AccessDenied' }), true);
  assert.equal(isKakaoCancelled({ code: 'Other' }), false);
  assert.equal(isKakaoCancelled(new Error('Cancelled')), false);
  assert.equal(isKakaoCancelled(undefined), false);
  assert.equal(isKakaoCancelled('Cancelled'), false);
});
