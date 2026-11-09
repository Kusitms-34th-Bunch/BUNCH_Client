import { renderHook } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { usePostLoginPath } from './session';

const DESTINATIONS = { bunchHome: '/bunch', bunchStart: '/onboarding' };

const respondWith = (data: unknown) =>
  server.use(http.get('/api/members/me/onboarding', () => ok(data as never)));

const setup = () => {
  const client = createTestQueryClient();
  const { result } = renderHook(() => usePostLoginPath(DESTINATIONS), {
    wrapper: createQueryWrapper(client),
  });
  return { client, resolve: result.current };
};

describe('usePostLoginPath', () => {
  it('가입 완료 사용자는 도착 화면으로 replace(로그인 화면을 기록에 남기지 않음)', async () => {
    respondWith({ memberId: 1, signupStatus: 'COMPLETED', termsAccepted: true, defaultBunchId: 7 });

    await expect(setup().resolve()).resolves.toEqual({ path: '/bunch', replace: true });
  });

  it('가입 중 사용자는 약관·프로필로 push(약관의 뒤로가기가 로그인으로 돌아옴)', async () => {
    respondWith({ memberId: 1, signupStatus: 'IN_PROGRESS', termsAccepted: false });
    await expect(setup().resolve()).resolves.toEqual({ path: '/signup/terms', replace: false });

    respondWith({ memberId: 1, signupStatus: 'IN_PROGRESS', termsAccepted: true });
    await expect(setup().resolve()).resolves.toEqual({ path: '/signup/profile', replace: false });
  });

  it('읽은 가입 상태를 세션 캐시에 채워 도착 화면의 가드가 같은 상태로 판단하게 한다', async () => {
    respondWith({ memberId: 1, signupStatus: 'IN_PROGRESS', termsAccepted: true });
    const { client, resolve } = setup();

    await resolve();

    expect(client.getQueryData(sharedKeys.session())).toEqual({
      signupStatus: 'IN_PROGRESS',
      termsAccepted: true,
      hasDefaultBunch: false,
    });
  });

  it('읽지 못하면 던지고 캐시를 채우지 않는다', async () => {
    server.use(http.get('/api/members/me/onboarding', () => fail(500, 'SERVER_ERROR')));
    const { client, resolve } = setup();

    await expect(resolve()).rejects.toThrow();
    expect(client.getQueryData(sharedKeys.session())).toBeUndefined();
  });
});
