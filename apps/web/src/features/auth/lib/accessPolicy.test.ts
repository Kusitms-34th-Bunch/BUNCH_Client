import { describe, expect, it } from 'vitest';
import type { OnboardingState } from '../api/onboarding';
import { resolveAccess, type SessionState } from './accessPolicy';

const DESTINATIONS = {
  bunchHome: '/bunch',
  bunchStart: '/onboarding',
  inviteEntry: '/onboarding/join/enter',
};

const member = (onboarding: OnboardingState): SessionState => ({ kind: 'member', onboarding });
const anonymous: SessionState = { kind: 'anonymous' };
const noTerms = member({
  memberId: 1,
  signupStatus: 'IN_PROGRESS',
  termsAccepted: false,
  hasDefaultBunch: false,
});
const termsDone = member({
  memberId: 1,
  signupStatus: 'IN_PROGRESS',
  termsAccepted: true,
  hasDefaultBunch: false,
});
const withBunch = member({
  memberId: 1,
  signupStatus: 'COMPLETED',
  termsAccepted: true,
  hasDefaultBunch: true,
});
const noBunch = member({
  memberId: 1,
  signupStatus: 'COMPLETED',
  termsAccepted: true,
  hasDefaultBunch: false,
});

const access = (pathname: string, session: SessionState) =>
  resolveAccess(pathname, session, DESTINATIONS, true);

describe('resolveAccess', () => {
  it('가입을 마친 사용자가 인트로에 들어오면 도착 화면으로 보낸다', () => {
    expect(access('/intro', withBunch)).toBe('/bunch');
  });

  it('가입 중인 사용자가 인트로에 들어오면 남은 가입 단계로 보낸다', () => {
    expect(access('/intro', noTerms)).toBe('/signup/terms');
    expect(access('/intro', termsDone)).toBe('/signup/profile');
  });

  describe('로그인하지 않은 사용자', () => {
    it('로그인 화면만 볼 수 있다', () => {
      expect(access('/login', anonymous)).toBeNull();
    });

    it.each([
      '/',
      '/bunch',
      '/feed',
      '/signup/terms',
      '/signup/profile',
      '/onboarding/create',
      '/intro',
    ])('%s에 들어가면 로그인으로 보낸다', (pathname) => {
      expect(access(pathname, anonymous)).toBe('/login');
    });

    it('인트로를 본 적 없으면 인트로만 볼 수 있다', () => {
      expect(resolveAccess('/intro', anonymous, DESTINATIONS, false)).toBeNull();
      expect(resolveAccess('/login', anonymous, DESTINATIONS, false)).toBe('/intro');
      expect(resolveAccess('/bunch', anonymous, DESTINATIONS, false)).toBe('/intro');
    });
  });

  describe('가입 중이고 약관에 동의하지 않은 사용자', () => {
    it.each(['/signup/terms', '/signup/terms/service', '/login'])('%s는 볼 수 있다', (pathname) => {
      expect(access(pathname, noTerms)).toBeNull();
    });

    it.each(['/', '/signup/profile', '/bunch', '/onboarding', '/my'])(
      '%s에 들어가면 약관으로 보낸다',
      (pathname) => {
        expect(access(pathname, noTerms)).toBe('/signup/terms');
      },
    );
  });

  describe('가입 중이고 약관에 동의한 사용자', () => {
    it.each(['/signup/terms', '/signup/terms/privacy', '/signup/profile', '/login'])(
      '%s는 볼 수 있다',
      (pathname) => {
        expect(access(pathname, termsDone)).toBeNull();
      },
    );

    it.each(['/', '/bunch', '/onboarding/create', '/photos'])(
      '%s에 들어가면 프로필로 보낸다',
      (pathname) => {
        expect(access(pathname, termsDone)).toBe('/signup/profile');
      },
    );
  });

  describe('가입을 마친 사용자', () => {
    it.each(['/', '/bunch', '/feed', '/onboarding', '/my/profile', '/bunch/bundles/new'])(
      '%s는 볼 수 있다',
      (pathname) => {
        expect(access(pathname, withBunch)).toBeNull();
        expect(access(pathname, noBunch)).toBeNull();
      },
    );

    it.each(['/login', '/signup/terms', '/signup/terms/service', '/signup/profile'])(
      '%s에 들어가면 도착 화면으로 보낸다(기본 번치가 있으면 번치 홈)',
      (pathname) => {
        expect(access(pathname, withBunch)).toBe('/bunch');
      },
    );

    it('기본 번치가 없으면 번치 시작 선택으로 보낸다', () => {
      expect(access('/login', noBunch)).toBe('/onboarding');
      expect(access('/signup/profile', noBunch)).toBe('/onboarding');
    });

    it('이름이 비슷한 경로(/signupfoo)는 가입 화면으로 보지 않는다', () => {
      expect(access('/signupfoo', withBunch)).toBeNull();
    });
  });

  describe('보관된 초대가 있을 때', () => {
    const member = {
      kind: 'member',
      onboarding: {
        memberId: 1,
        signupStatus: 'COMPLETED',
        termsAccepted: true,
        hasDefaultBunch: true,
      },
    } as const;

    it('가입을 마친 사용자가 로그인·가입 화면에 있으면 초대 진입으로 보낸다', () => {
      for (const pathname of ['/login', '/intro', '/signup/profile']) {
        expect(resolveAccess(pathname, member, DESTINATIONS, true, true)).toBe(
          '/onboarding/join/enter',
        );
      }
    });

    it('다른 화면의 접근은 바꾸지 않는다(초대가 있어도 접근을 넓히거나 막지 않음)', () => {
      expect(resolveAccess('/bunch', member, DESTINATIONS, true, true)).toBeNull();
      expect(resolveAccess('/onboarding/join/enter', member, DESTINATIONS, true, true)).toBeNull();
    });
  });
});
