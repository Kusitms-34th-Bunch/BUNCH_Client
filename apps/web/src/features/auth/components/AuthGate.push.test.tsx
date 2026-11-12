import { render, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper } from '@/shared/query/testing';
import { AuthGate } from './AuthGate';

// 푸시 등록 hook이 어떤 상태에서 켜지는지만 확인(등록 동작 자체는 hook·lib 테스트가 다룸)
const sync = vi.hoisted(() => vi.fn<(_memberId: string | null) => void>());
vi.mock('@/shared/hooks/usePushDeviceSync', () => ({ usePushDeviceSync: sync }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/bunch',
}));

const renderGate = () =>
  render(
    <AuthGate
      destinations={{
        bunchHome: '/bunch',
        bunchStart: '/onboarding',
        inviteEntry: '/onboarding/join/enter',
      }}
    >
      <p>보호된 화면</p>
    </AuthGate>,
    { wrapper: createQueryWrapper() },
  );

const lastEnabled = () => sync.mock.calls.at(-1)?.[0];

beforeEach(() => vi.clearAllMocks());

describe('AuthGate 푸시 기기 등록', () => {
  it('가입을 마친 회원이면 등록을 켠다', async () => {
    server.use(
      http.get('/api/members/me/onboarding', () =>
        ok({ memberId: 1, signupStatus: 'COMPLETED', termsAccepted: true, defaultBunchId: 7 }),
      ),
    );

    renderGate();

    expect(await screen.findByText('보호된 화면')).toBeTruthy();
    expect(lastEnabled()).toBe('1');
  });

  it('가입 중인 회원이면 서버가 받지 않으므로 등록을 켜지 않는다', async () => {
    server.use(
      http.get('/api/members/me/onboarding', () =>
        ok({ memberId: 1, signupStatus: 'IN_PROGRESS', termsAccepted: true, defaultBunchId: null }),
      ),
    );

    renderGate();
    await waitFor(() => expect(sync).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(sync.mock.calls.every(([memberId]) => memberId === null)).toBe(true);
  });

  it('비로그인이면 등록을 켜지 않는다', async () => {
    server.use(http.get('/api/members/me/onboarding', () => fail(401, 'AUTH_001')));

    renderGate();
    await waitFor(() => expect(sync).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(sync.mock.calls.every(([memberId]) => memberId === null)).toBe(true);
  });
});
