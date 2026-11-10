import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { getOnboarding } from './onboarding';

const respondWith = (data: unknown) =>
  server.use(http.get('/api/members/me/onboarding', () => ok(data as never)));

describe('getOnboarding', () => {
  it('가입 상태와 약관 동의, 기본 번치 유무를 돌려준다', async () => {
    respondWith({ memberId: 1, signupStatus: 'COMPLETED', termsAccepted: true, defaultBunchId: 7 });

    await expect(getOnboarding()).resolves.toEqual({
      memberId: 1,
      signupStatus: 'COMPLETED',
      termsAccepted: true,
      hasDefaultBunch: true,
    });
  });

  it('기본 번치가 응답에 없으면(생략·null) 번치가 없는 것으로 본다', async () => {
    respondWith({
      memberId: 1,
      signupStatus: 'COMPLETED',
      termsAccepted: true,
      defaultBunchId: null,
    });
    await expect(getOnboarding()).resolves.toMatchObject({ hasDefaultBunch: false });

    respondWith({ memberId: 1, signupStatus: 'IN_PROGRESS', termsAccepted: false });
    await expect(getOnboarding()).resolves.toMatchObject({
      signupStatus: 'IN_PROGRESS',
      hasDefaultBunch: false,
    });
  });

  it('서버 오류이거나 계약에 어긋난 응답이면 던진다', async () => {
    server.use(http.get('/api/members/me/onboarding', () => fail(500, 'SERVER_ERROR')));
    await expect(getOnboarding()).rejects.toThrow();

    respondWith({ memberId: 1, signupStatus: 'UNKNOWN', termsAccepted: true });
    await expect(getOnboarding()).rejects.toThrow();
  });

  it('로그인하지 않았으면 401 ApiError로 던진다', async () => {
    server.use(http.get('/api/members/me/onboarding', () => fail(401, 'AUTH_001')));

    await expect(getOnboarding()).rejects.toMatchObject({ status: 401, category: 'auth' });
  });
});
