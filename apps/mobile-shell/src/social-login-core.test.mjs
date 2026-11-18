import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createAppleLogin,
  createGoogleLogin,
  createKakaoLogin,
  isAppleCancelled,
  isGoogleCancelled,
  isKakaoCancelled,
} from './social-login-core.ts';

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

const setupGoogle = (overrides = {}) => {
  const calls = { configure: [], signIn: 0 };
  const googleLogin = createGoogleLogin({
    iosClientId: 'ios-client',
    webClientId: 'web-client',
    configure: (options) => calls.configure.push(options),
    signIn: () => {
      calls.signIn += 1;
      return Promise.resolve({ type: 'success', data: { idToken: 'google-id-token' } });
    },
    ...overrides,
  });
  return { googleLogin, calls };
};

test('구글: 성공하면 ID 토큰을 돌려주고 nonce는 없다', async () => {
  const { googleLogin } = setupGoogle();

  assert.deepEqual(await googleLogin(), {
    status: 'success',
    provider: 'google',
    idToken: 'google-id-token',
  });
});

test('구글: SDK 설정은 처음 한 번만 하고 클라이언트 ID를 넘긴다', async () => {
  const { googleLogin, calls } = setupGoogle();

  await googleLogin();
  await googleLogin();

  assert.deepEqual(calls.configure, [{ iosClientId: 'ios-client', webClientId: 'web-client' }]);
});

test('구글: 웹 클라이언트 ID가 없으면 iOS 클라이언트 ID만 넘긴다', async () => {
  const { googleLogin, calls } = setupGoogle({ webClientId: undefined });

  await googleLogin();

  assert.deepEqual(calls.configure, [{ iosClientId: 'ios-client' }]);
});

test('구글: 취소 응답과 취소 오류 코드는 실패가 아닌 취소로 돌려준다', async () => {
  const response = setupGoogle({ signIn: () => Promise.resolve({ type: 'cancelled' }) });
  assert.deepEqual(await response.googleLogin(), { status: 'cancelled' });

  const rejected = setupGoogle({
    signIn: () => Promise.reject(Object.assign(new Error('native'), { code: 'SIGN_IN_CANCELLED' })),
  });
  assert.deepEqual(await rejected.googleLogin(), { status: 'cancelled' });
});

test('구글: 그 밖의 SDK 오류는 원문 없이 일반 문구로 던진다', async () => {
  const { googleLogin } = setupGoogle({
    signIn: () => Promise.reject(Object.assign(new Error('secret-detail'), { code: 'X' })),
  });

  await assert.rejects(googleLogin, (error) => {
    assert.equal(error.message, '구글 로그인에 실패했어요.');
    return true;
  });
});

test('구글: ID 토큰이 없으면 웹 클라이언트 ID 확인 안내와 함께 던진다', async () => {
  const { googleLogin } = setupGoogle({
    signIn: () => Promise.resolve({ type: 'success', data: { idToken: null } }),
  });

  await assert.rejects(googleLogin, /EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID/);
});

test('구글: iOS 클라이언트 ID가 없으면 설정하지 않고 안내와 함께 던진다', async () => {
  const { googleLogin, calls } = setupGoogle({ iosClientId: undefined });

  await assert.rejects(googleLogin, /EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID/);
  assert.deepEqual(calls.configure, []);
});

test('구글: 진행 중에 다시 호출해도 로그인 창을 한 번만 띄운다', async () => {
  const { googleLogin, calls } = setupGoogle();

  await Promise.all([googleLogin(), googleLogin()]);

  assert.equal(calls.signIn, 1);
});

test('구글: 취소 판별은 오류 코드만 본다', () => {
  assert.equal(isGoogleCancelled({ code: 'SIGN_IN_CANCELLED' }), true);
  assert.equal(isGoogleCancelled({ code: 'OTHER' }), false);
  assert.equal(isGoogleCancelled(new Error('SIGN_IN_CANCELLED')), false);
});

// ---- Apple ----

const setupApple = (overrides = {}) => {
  const calls = { signIn: [] };
  let counter = 0;
  const appleLogin = createAppleLogin({
    isAvailable: () => Promise.resolve(true),
    signIn: (options) => {
      calls.signIn.push(options);
      return Promise.resolve({ identityToken: 'apple-token' });
    },
    randomNonce: () => `nonce-${(counter += 1)}`,
    sha256Hex: (value) => Promise.resolve(`sha256(${value})`),
    ...overrides,
  });
  return { appleLogin, calls };
};

test('Apple 요청에는 nonce의 SHA-256 값을 싣고, 웹에는 원본 nonce와 ID 토큰을 돌려준다', async () => {
  const { appleLogin, calls } = setupApple();

  assert.deepEqual(await appleLogin(), {
    status: 'success',
    provider: 'apple',
    idToken: 'apple-token',
    nonce: 'nonce-1',
  });
  assert.deepEqual(calls.signIn, [{ nonce: 'sha256(nonce-1)' }]);
});

test('Apple 로그인 창을 닫으면 실패가 아니라 cancelled로 돌려준다', async () => {
  const { appleLogin } = setupApple({
    signIn: () => Promise.reject(Object.assign(new Error('x'), { code: 'ERR_REQUEST_CANCELED' })),
  });

  assert.deepEqual(await appleLogin(), { status: 'cancelled' });
  assert.equal(isAppleCancelled({ code: 'ERR_REQUEST_UNKNOWN' }), false);
});

test('Apple SDK 오류는 SDK 원문 없이 일반 문구로 던진다', async () => {
  const { appleLogin } = setupApple({
    signIn: () => Promise.reject(new Error('raw sdk message token=abc')),
  });

  await assert.rejects(appleLogin(), { message: 'Apple 로그인에 실패했어요.' });
});

test('Apple 로그인을 쓸 수 없는 기기면 로그인 창을 열지 않고 실패한다', async () => {
  const { appleLogin, calls } = setupApple({ isAvailable: () => Promise.resolve(false) });

  await assert.rejects(appleLogin(), /쓸 수 없어요/);
  assert.equal(calls.signIn.length, 0);
});

test('Apple ID 토큰이 없으면 실패한다', async () => {
  const { appleLogin } = setupApple({ signIn: () => Promise.resolve({ identityToken: null }) });

  await assert.rejects(appleLogin(), /ID 토큰/);
});

test('Apple 로그인이 진행 중이면 다시 눌러도 로그인 창을 한 번만 연다', async () => {
  const { appleLogin, calls } = setupApple();

  const [first, second] = await Promise.all([appleLogin(), appleLogin()]);

  assert.equal(first, second);
  assert.equal(calls.signIn.length, 1);
});

test('Apple 로그인 가능 여부 확인이 실패해도 SDK 원문 없이 일반 문구로 던진다', async () => {
  const { appleLogin } = setupApple({ isAvailable: () => Promise.reject(new Error('raw native')) });

  await assert.rejects(appleLogin(), { message: 'Apple 로그인에 실패했어요.' });
});

test('Apple nonce는 로그인마다 새로 만든다', async () => {
  const { appleLogin } = setupApple();

  const first = await appleLogin();
  const second = await appleLogin();

  assert.notEqual(first.nonce, second.nonce);
});

test('Apple SDK 오류 뒤 같은 로그인 함수로 다시 시도하면 로그인 창을 다시 연다', async () => {
  let calls = 0;
  const { appleLogin } = setupApple({
    signIn: () => {
      calls += 1;
      return calls === 1
        ? Promise.reject(new Error('sdk'))
        : Promise.resolve({ identityToken: 'apple-token' });
    },
  });

  await assert.rejects(appleLogin(), { message: 'Apple 로그인에 실패했어요.' });
  const second = await appleLogin();

  assert.equal(calls, 2);
  assert.equal(second.status, 'success');
});
