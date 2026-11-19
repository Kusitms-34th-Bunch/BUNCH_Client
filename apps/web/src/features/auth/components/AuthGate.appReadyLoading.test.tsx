import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { AuthGate } from './AuthGate';

// 한 번만 보내는 기록이 모듈에 남아 사례마다 파일을 나눔
const shell = vi.hoisted(() => ({ appReady: vi.fn(() => Promise.resolve()) }));
vi.mock('@/shared/bridge/client', () => ({
  isNativeShell: () => true,
  isHandedOffToNativeTabs: () => false,
  appBridge: { appReady: shell.appReady },
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/bunch',
}));

afterEach(() => vi.restoreAllMocks());

describe('AuthGate 앱 쉘 준비 알림(보이는 WebView의 도착 화면 로딩)', () => {
  it('보이는 WebView라도 도착 화면이 전체 로딩 중이면 기다렸다가, 로딩이 끝나면 알린다', async () => {
    server.use(
      http.get('/api/members/me/onboarding', () =>
        ok({ memberId: 1, signupStatus: 'COMPLETED', termsAccepted: true, defaultBunchId: 7 }),
      ),
    );
    const client = createTestQueryClient();
    const gate = (children: ReactNode) => (
      <AuthGate
        destinations={{
          bunchHome: '/bunch',
          bunchStart: '/onboarding',
          inviteEntry: '/onboarding/join/enter',
        }}
      >
        {children}
      </AuthGate>
    );
    const { rerender } = render(
      gate(
        <>
          <p>보호된 화면</p>
          <PageLoading />
        </>,
      ),
      { wrapper: createQueryWrapper(client) },
    );

    expect(await screen.findByText('보호된 화면')).toBeTruthy();
    expect(shell.appReady).not.toHaveBeenCalled();

    rerender(gate(<p>보호된 화면</p>));
    await waitFor(() => expect(shell.appReady).toHaveBeenCalledOnce());
  });
});
