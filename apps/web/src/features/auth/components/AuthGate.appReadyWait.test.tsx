import type { ReactNode } from 'react';
import { act, render, screen } from '@testing-library/react';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { PageLoading } from '@/shared/components/loading/PageLoading';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { AuthGate } from './AuthGate';

// 한 번만 보내는 기록이 모듈에 남아 AuthGate.appReady.test.tsx와 파일을 나눔
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

describe('AuthGate 앱 쉘 준비 알림(도착 화면 내용까지)', () => {
  it('도착 화면이 전체 로딩 중이거나 WebView가 가려져 있으면 기다렸다가, 내용이 보이게 되면 한 번 알린다', async () => {
    server.use(
      http.get('/api/members/me/onboarding', () =>
        ok({ memberId: 1, signupStatus: 'COMPLETED', termsAccepted: true, defaultBunchId: 7 }),
      ),
    );
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
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

    // 도착지는 정해졌지만 도착 화면이 데이터를 받는 중(전체 로딩)
    expect(await screen.findByText('보호된 화면')).toBeTruthy();
    expect(shell.appReady).not.toHaveBeenCalled();

    // 내용을 그렸지만 가려진 WebView(뒤에서 미리 그려지는 탭)
    rerender(gate(<p>보호된 화면</p>));
    expect(shell.appReady).not.toHaveBeenCalled();

    visibility.mockReturnValue('visible');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(shell.appReady).toHaveBeenCalledOnce();
  });
});
