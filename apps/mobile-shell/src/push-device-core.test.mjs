import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createPushDeviceReader,
  isApnsToken,
  toAuthorizationStatus,
  toPushEnvironment,
} from './push-device-core.ts';

const UUID = 'b37d231c-5a60-4cf8-a83c-ae4b704154b7';

const setup = (overrides = {}) => {
  const calls = { token: 0, create: 0, permission: 0 };
  const deps = {
    isIos: true,
    isDev: true,
    readInstallationId: () => Promise.resolve(UUID),
    createInstallationId: () => {
      calls.create += 1;
      return Promise.resolve('11111111-2222-4333-8444-555555555555');
    },
    readIosPermissionStatus: () => {
      calls.permission += 1;
      return Promise.resolve(2);
    },
    readDeviceToken: () => {
      calls.token += 1;
      return Promise.resolve('aabbccdd');
    },
    ...overrides,
  };
  return { read: createPushDeviceReader(deps), calls };
};

test('APNs 토큰은 16진수 짝수 길이 2~4096자만 인정한다', () => {
  for (const token of ['aa', 'AABBCCDD', 'a'.repeat(4096)]) assert.equal(isApnsToken(token), true);
  for (const token of ['', 'a', 'abc', 'zz', 'aa bb', 'a'.repeat(4098), 123, null, undefined, {}]) {
    assert.equal(isApnsToken(token), false, String(token));
  }
});

test('iOS 권한 코드를 서버 값으로 바꾼다', () => {
  assert.equal(toAuthorizationStatus(0), 'NOT_DETERMINED');
  assert.equal(toAuthorizationStatus(1), 'DENIED');
  assert.equal(toAuthorizationStatus(2), 'AUTHORIZED');
  assert.equal(toAuthorizationStatus(3), 'PROVISIONAL');
  // 앱 클립의 임시 허용은 허용으로, 모르는 값·없음은 정하지 않음으로
  assert.equal(toAuthorizationStatus(4), 'AUTHORIZED');
  assert.equal(toAuthorizationStatus(99), 'NOT_DETERMINED');
  assert.equal(toAuthorizationStatus(undefined), 'NOT_DETERMINED');
});

test('개발 빌드는 샌드박스, 배포 빌드는 운영이다', () => {
  assert.equal(toPushEnvironment(true), 'SANDBOX');
  assert.equal(toPushEnvironment(false), 'PRODUCTION');
});

test('저장된 설치 ID로 설치 ID·토큰·환경·권한 상태를 만든다', async () => {
  const { read, calls } = setup();

  assert.deepEqual(await read(), {
    installationId: UUID,
    deviceToken: 'aabbccdd',
    environment: 'SANDBOX',
    authorizationStatus: 'AUTHORIZED',
  });
  assert.equal(calls.create, 0);
});

test('저장된 설치 ID가 없으면 새로 만들어 쓴다', async () => {
  const { read, calls } = setup({ readInstallationId: () => Promise.resolve(null) });

  const result = await read();

  assert.equal(result?.installationId, '11111111-2222-4333-8444-555555555555');
  assert.equal(calls.create, 1);
});

test('설치 ID를 저장하지 못하면 null이다(저장하지 못한 ID는 호출마다 다른 기기가 됨)', async () => {
  const { read } = setup({
    readInstallationId: () => Promise.resolve(null),
    createInstallationId: () => Promise.resolve(null),
  });

  assert.equal(await read(), null);
});

test('iOS가 아니면 토큰을 요청하지 않고 null이다', async () => {
  const { read, calls } = setup({ isIos: false });

  assert.equal(await read(), null);
  assert.equal(calls.token, 0);
});

test('토큰을 받지 못하거나(시뮬레이터 등) 형식이 맞지 않으면 설치 ID를 만들지 않고 null이다', async () => {
  const rejected = setup({ readDeviceToken: () => Promise.reject(new Error('no token')) });
  assert.equal(await rejected.read(), null);
  assert.equal(rejected.calls.create, 0);

  for (const token of ['not-hex', '', 'abc', undefined, 42]) {
    const invalid = setup({
      readInstallationId: () => Promise.resolve(null),
      readDeviceToken: () => Promise.resolve(token),
    });
    assert.equal(await invalid.read(), null, String(token));
    assert.equal(invalid.calls.create, 0);
  }
});

test('권한 상태를 읽지 못해도 토큰이 있으면 정하지 않음으로 등록 정보를 만든다', async () => {
  const { read } = setup({ readIosPermissionStatus: () => Promise.resolve(undefined) });

  assert.equal((await read())?.authorizationStatus, 'NOT_DETERMINED');
});

test('권한을 읽는 중 오류가 나면 null이고 오류 내용을 밖으로 던지지 않는다', async () => {
  const { read } = setup({
    readIosPermissionStatus: () => Promise.reject(new Error('secret-token-aabbccdd')),
  });

  assert.equal(await read(), null);
});

test('겹쳐 부르면 토큰을 한 번만 읽고 같은 결과를 돌려주며, 끝난 뒤에는 다시 읽는다', async () => {
  const { read, calls } = setup();

  const [first, second] = await Promise.all([read(), read()]);

  assert.equal(calls.token, 1);
  assert.deepEqual(first, second);

  await read();
  assert.equal(calls.token, 2);
});
