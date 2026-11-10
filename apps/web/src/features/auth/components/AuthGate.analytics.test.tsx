import { render, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper } from '@/shared/query/testing';
import { AuthGate } from './AuthGate';

const setAnalyticsConsent = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('@/shared/config/posthog', () => ({ setAnalyticsConsent }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/bunch',
}));

const renderGate = () =>
  render(
    <AuthGate destinations={{ bunchHome: '/bunch', bunchStart: '/onboarding' }}>
      <p>보호된 화면</p>
    </AuthGate>,
    { wrapper: createQueryWrapper() },
  );

const onboarding = (termsAccepted: boolean) =>
  http.get('/api/members/me/onboarding', () =>
    ok({
      memberId: 1,
      signupStatus: termsAccepted ? 'COMPLETED' : 'IN_PROGRESS',
      termsAccepted,
      defaultBunchId: 7,
    }),
  );

describe('AuthGate 제품 분석 동의', () => {
  it('약관에 동의한 회원이면 그 회원으로 수집을 켠다', async () => {
    server.use(onboarding(true));
    renderGate();

    expect(await screen.findByText('보호된 화면')).toBeTruthy();
    expect(setAnalyticsConsent).toHaveBeenLastCalledWith('1');
  });

  it('약관에 동의하지 않은 회원이면 끈다', async () => {
    server.use(onboarding(false));
    renderGate();

    await waitFor(() => expect(setAnalyticsConsent).toHaveBeenLastCalledWith(null));
  });

  it('비로그인이면 끄고, 상태를 확인하는 동안에는 바꾸지 않는다', async () => {
    server.use(http.get('/api/members/me/onboarding', () => fail(401, 'AUTH_001')));
    setAnalyticsConsent.mockClear();
    renderGate();

    expect(setAnalyticsConsent).not.toHaveBeenCalled();
    await waitFor(() => expect(setAnalyticsConsent).toHaveBeenLastCalledWith(null));
  });
});
