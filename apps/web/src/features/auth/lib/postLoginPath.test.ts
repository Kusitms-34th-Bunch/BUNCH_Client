import { describe, expect, it } from 'vitest';
import { resolvePostLoginPath } from './postLoginPath';

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
