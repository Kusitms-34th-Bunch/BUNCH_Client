import { render, screen } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createQueryWrapper } from '@/shared/query/testing';
import { AuthGate } from './AuthGate';

// 앱 쉘 안이라고 보고 bridge 호출만 기록(한 번만 보내는 기록이 모듈에 남아 이 파일에 따로 둠)
const shell = vi.hoisted(() => ({ native: false, appReady: vi.fn(() => Promise.resolve()) }));
vi.mock('@/shared/bridge/client', () => ({
  isNativeShell: () => shell.native,
  appBridge: { appReady: shell.appReady },
}));
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

describe('AuthGate 앱 쉘 준비 알림', () => {
  it('브라우저에서는 알리지 않는다', async () => {
    server.use(
      http.get('/api/members/me/onboarding', () =>
        ok({ memberId: 1, signupStatus: 'COMPLETED', termsAccepted: true, defaultBunchId: 7 }),
      ),
    );
    renderGate();

    expect(await screen.findByText('보호된 화면')).toBeTruthy();
    expect(shell.appReady).not.toHaveBeenCalled();
  });

  it('앱 쉘에서는 도착 화면을 그린 뒤 한 번만 알려 스플래시를 닫게 한다', async () => {
    shell.native = true;
    server.use(
      http.get('/api/members/me/onboarding', () =>
        ok({ memberId: 1, signupStatus: 'COMPLETED', termsAccepted: true, defaultBunchId: 7 }),
      ),
    );
    const { unmount } = renderGate();
    // 상태를 확인하는 동안(로딩)에는 알리지 않음
    expect(shell.appReady).not.toHaveBeenCalled();

    expect(await screen.findByText('보호된 화면')).toBeTruthy();
    expect(shell.appReady).toHaveBeenCalledOnce();

    // 다른 화면(탭 WebView 등)이 다시 그려도 더 보내지 않음
    unmount();
    renderGate();
    expect(await screen.findByText('보호된 화면')).toBeTruthy();
    expect(shell.appReady).toHaveBeenCalledOnce();
  });
});
