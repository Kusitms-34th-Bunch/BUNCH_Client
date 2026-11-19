import { render, screen } from '@testing-library/react';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { AuthGate } from './AuthGate';

// 한 번만 보내는 기록이 모듈에 남아 사례마다 파일을 나눔
const shell = vi.hoisted(() => ({ appReady: vi.fn(() => Promise.resolve()) }));
vi.mock('@/shared/bridge/client', () => ({
  isNativeShell: () => true,
  isHandedOffToNativeTabs: () => true,
  appBridge: { appReady: shell.appReady },
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/bunch',
}));

afterEach(() => vi.restoreAllMocks());

describe('AuthGate 앱 쉘 준비 알림(탭 화면을 시작한 첫 화면 WebView)', () => {
  it('탭 화면을 시작하고 버려질 첫 화면 WebView는 내용을 그려도 알리지 않는다', async () => {
    server.use(
      http.get('/api/members/me/onboarding', () =>
        ok({ memberId: 1, signupStatus: 'COMPLETED', termsAccepted: true, defaultBunchId: 7 }),
      ),
    );
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
      { wrapper: createQueryWrapper(createTestQueryClient()) },
    );

    expect(await screen.findByText('보호된 화면')).toBeTruthy();
    expect(shell.appReady).not.toHaveBeenCalled();
  });
});
