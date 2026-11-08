import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { fetchPostLoginPath, resolvePostLoginPath } from './postLoginPath';

const DESTINATIONS = { bunchHome: '/bunch', bunchStart: '/onboarding' };

describe('resolvePostLoginPath', () => {
  it.each([
    ['가입 중이고 약관에 동의하지 않았으면 약관', 'IN_PROGRESS', false, false, '/signup/terms'],
    ['가입 중이고 약관에 동의했으면 프로필', 'IN_PROGRESS', true, false, '/signup/profile'],
    ['가입을 마치고 기본 번치가 있으면 번치 홈', 'COMPLETED', true, true, '/bunch'],
    ['가입을 마쳤지만 번치가 없으면 번치 시작 선택', 'COMPLETED', true, false, '/onboarding'],
  ] as const)('%s', (_name, signupStatus, termsAccepted, hasDefaultBunch, expected) => {
    expect(
      resolvePostLoginPath({ signupStatus, termsAccepted, hasDefaultBunch }, DESTINATIONS),
    ).toBe(expected);
  });

  it('가입 중에는 번치가 있어도 가입 단계를 먼저 마치게 한다', () => {
    expect(
      resolvePostLoginPath(
        { signupStatus: 'IN_PROGRESS', termsAccepted: false, hasDefaultBunch: true },
        DESTINATIONS,
      ),
    ).toBe('/signup/terms');
  });
});

describe('fetchPostLoginPath', () => {
  it('서버의 가입 상태를 읽어 도착 화면을 정한다', async () => {
    server.use(
      http.get('/api/members/me/onboarding', () =>
        ok({ memberId: 1, signupStatus: 'COMPLETED', termsAccepted: true, defaultBunchId: 7 }),
      ),
    );

    await expect(fetchPostLoginPath(DESTINATIONS)).resolves.toBe('/bunch');
  });

  it('기본 번치가 응답에 없으면(생략·null) 번치가 없는 것으로 본다', async () => {
    server.use(
      http.get('/api/members/me/onboarding', () =>
        ok({ memberId: 1, signupStatus: 'COMPLETED', termsAccepted: true, defaultBunchId: null }),
      ),
    );
    await expect(fetchPostLoginPath(DESTINATIONS)).resolves.toBe('/onboarding');

    server.use(
      http.get('/api/members/me/onboarding', () =>
        ok({ memberId: 1, signupStatus: 'COMPLETED', termsAccepted: true }),
      ),
    );
    await expect(fetchPostLoginPath(DESTINATIONS)).resolves.toBe('/onboarding');
  });

  it('가입 중이고 약관에 동의했으면 프로필로 보낸다', async () => {
    server.use(
      http.get('/api/members/me/onboarding', () =>
        ok({ memberId: 1, signupStatus: 'IN_PROGRESS', termsAccepted: true }),
      ),
    );

    await expect(fetchPostLoginPath(DESTINATIONS)).resolves.toBe('/signup/profile');
  });

  it('서버 오류이거나 계약에 어긋난 응답이면 던진다', async () => {
    server.use(http.get('/api/members/me/onboarding', () => fail(500, 'SERVER_ERROR')));
    await expect(fetchPostLoginPath(DESTINATIONS)).rejects.toThrow();

    server.use(
      http.get('/api/members/me/onboarding', () =>
        ok({ memberId: 1, signupStatus: 'UNKNOWN', termsAccepted: true }),
      ),
    );
    await expect(fetchPostLoginPath(DESTINATIONS)).rejects.toThrow();
  });
});
