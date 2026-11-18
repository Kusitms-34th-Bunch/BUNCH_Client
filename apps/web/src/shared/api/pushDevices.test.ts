import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { registerPushDevice, unregisterPushDevice } from './pushDevices';

const UUID = 'b37d231c-5a60-4cf8-a83c-ae4b704154b7';
const registration = {
  installationId: UUID,
  deviceToken: 'aabbccdd',
  environment: 'SANDBOX',
  authorizationStatus: 'AUTHORIZED',
} as const;

describe('registerPushDevice', () => {
  it('설치 ID를 경로에, 토큰·환경·권한 상태를 본문에 담아 PUT하고 응답을 돌려준다', async () => {
    const seen: { path: string; body: unknown }[] = [];
    server.use(
      http.put('/api/members/me/push-devices/:installationId', async ({ request }) => {
        seen.push({ path: new URL(request.url).pathname, body: await request.json() });
        return ok({
          installationId: UUID,
          environment: 'SANDBOX',
          authorizationStatus: 'AUTHORIZED',
          registeredAt: '2026-11-13T09:00:00Z',
        });
      }),
    );

    await expect(registerPushDevice(registration)).resolves.toMatchObject({
      installationId: UUID,
      environment: 'SANDBOX',
    });
    expect(seen).toEqual([
      {
        path: `/api/members/me/push-devices/${UUID}`,
        // 설치 ID는 경로에만 있고 본문에는 없음
        body: {
          deviceToken: 'aabbccdd',
          environment: 'SANDBOX',
          authorizationStatus: 'AUTHORIZED',
        },
      },
    ]);
  });

  it.each([
    ['UUID가 아닌 설치 ID', { ...registration, installationId: '../me' }],
    ['16진수가 아닌 토큰', { ...registration, deviceToken: 'not-hex' }],
    ['홀수 길이 토큰', { ...registration, deviceToken: 'abc' }],
    ['모르는 환경', { ...registration, environment: 'STAGING' }],
    ['모르는 권한 상태', { ...registration, authorizationStatus: 'GRANTED' }],
  ])('%s은 요청을 보내지 않고 던진다', async (_name, invalid) => {
    let requested = false;
    server.use(
      http.put('/api/members/me/push-devices/:installationId', () => {
        requested = true;
        return ok({});
      }),
    );

    await expect(async () => registerPushDevice(invalid as never)).rejects.toThrow();
    expect(requested).toBe(false);
  });

  it('서버가 거절하거나 계약에 어긋난 응답이면 던진다', async () => {
    server.use(
      http.put('/api/members/me/push-devices/:installationId', () => fail(401, 'AUTH_001')),
    );
    await expect(registerPushDevice(registration)).rejects.toThrow();

    server.use(
      http.put('/api/members/me/push-devices/:installationId', () =>
        ok({ installationId: UUID } as never),
      ),
    );
    await expect(registerPushDevice(registration)).rejects.toThrow();
  });

  it('오류에 토큰을 담지 않는다', async () => {
    server.use(
      http.put('/api/members/me/push-devices/:installationId', () => fail(500, 'COMMON_500')),
    );

    const error = await registerPushDevice({ ...registration, deviceToken: 'deadbeef' }).catch(
      (caught: unknown) => caught,
    );

    expect(JSON.stringify(error, Object.getOwnPropertyNames(error as object))).not.toContain(
      'deadbeef',
    );
  });
});

describe('unregisterPushDevice', () => {
  it('설치 ID로 DELETE하고 본문 없는 성공을 받아들인다', async () => {
    const paths: string[] = [];
    server.use(
      http.delete('/api/members/me/push-devices/:installationId', ({ request }) => {
        paths.push(new URL(request.url).pathname);
        return ok(null);
      }),
    );

    await expect(unregisterPushDevice(UUID)).resolves.toBeUndefined();
    expect(paths).toEqual([`/api/members/me/push-devices/${UUID}`]);
  });

  it('UUID가 아닌 설치 ID는 요청을 보내지 않고 던진다', async () => {
    let requested = false;
    server.use(
      http.delete('/api/members/me/push-devices/:installationId', () => {
        requested = true;
        return ok(null);
      }),
    );

    await expect(unregisterPushDevice('../../auth/logout')).rejects.toThrow();
    expect(requested).toBe(false);
  });

  it('서버가 거절하면 던진다', async () => {
    server.use(
      http.delete('/api/members/me/push-devices/:installationId', () => fail(404, 'RESOURCE_001')),
    );

    await expect(unregisterPushDevice(UUID)).rejects.toThrow();
  });
});
