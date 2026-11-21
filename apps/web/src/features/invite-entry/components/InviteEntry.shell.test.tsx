import type * as DesignSystem from '@app/design-system';
import type { ReactNode } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { clearPendingInvitation, readPendingInvitation } from '@/shared/lib/pendingInvitation';
import { createQueryWrapper } from '@/shared/query/testing';
import { InviteEntry } from './InviteEntry';

// 유니버셜 링크로 앱이 열려 쉘 WebView 안에서 이 화면을 연 경우
const shell = vi.hoisted(() => ({ appReady: vi.fn(() => Promise.resolve()) }));
vi.mock('@/shared/bridge/client', () => ({
  isNativeShell: () => true,
  appBridge: { appReady: shell.appReady },
}));
const push = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace }) }));
type ToastArgs = Parameters<typeof DesignSystem.toast>;
const toast = vi.fn<(..._args: ToastArgs) => void>();
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast: (...args: ToastArgs) => toast(...args),
}));

const Query = createQueryWrapper();
const Providers = ({ children }: { children: ReactNode }) => <Query>{children}</Query>;
const CONTINUE = '/onboarding/join/enter';
const renderEntry = (token = 'ABCD2345') =>
  render(<InviteEntry token={token} continueHref={CONTINUE} />, { wrapper: Providers });

describe('InviteEntry 앱 안', () => {
  beforeEach(() => {
    push.mockClear();
    replace.mockClear();
    toast.mockClear();
    shell.appReady.mockClear();
    clearPendingInvitation();
  });

  it('앱 설치하기를 숨기고, 누르지 않아도 한 번만 확인한 뒤 history를 바꿔 이어 간다', async () => {
    let calls = 0;
    server.use(
      http.get('/api/invitations/:token', () => {
        calls += 1;
        return ok({ name: '여행가조', introduction: '소개', code: 'ABCD2345' });
      }),
    );
    renderEntry();

    expect(screen.queryByRole('link', { name: '앱 설치하기' })).toBeNull();
    await waitFor(() => expect(replace).toHaveBeenCalledWith(CONTINUE));
    expect(push).not.toHaveBeenCalled();
    expect(calls).toBe(1);
    expect(readPendingInvitation()).toBe('ABCD2345');
    // 성공은 접근 가드가 있는 다음 화면이 스플래시를 닫음
    expect(shell.appReady).not.toHaveBeenCalled();
  });

  it('없는 링크면 이 화면에 머물러 알리고 스플래시를 닫는다', async () => {
    server.use(http.get('/api/invitations/:token', () => fail(404, 'INVITE_001')));
    renderEntry();

    await waitFor(() => expect(toast).toHaveBeenCalledWith('유효하지 않은 링크입니다.'));
    expect(shell.appReady).toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(readPendingInvitation()).toBeNull();
    expect(screen.getByRole('button', { name: '초대장 확인하기' })).toBeTruthy();
  });

  it('형식이 아닌 토큰은 서버에 묻지 않고 알린 뒤 스플래시를 닫는다', async () => {
    let called = false;
    server.use(
      http.get('/api/invitations/:token', () => {
        called = true;
        return ok({ name: '여행가조', introduction: '소개', code: 'ABCD2345' });
      }),
    );
    renderEntry('short');

    await waitFor(() => expect(toast).toHaveBeenCalledWith('유효하지 않은 링크입니다.'));
    expect(shell.appReady).toHaveBeenCalled();
    expect(called).toBe(false);
  });

  it('일시적 오류는 알리고 스플래시를 닫으며, 다시 누르면 이어 간다', async () => {
    let calls = 0;
    server.use(
      http.get('/api/invitations/:token', () =>
        ++calls === 1
          ? fail(503, 'AUTH_018')
          : ok({ name: '여행가조', introduction: '소개', code: 'ABCD2345' }),
      ),
    );
    renderEntry();

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith('일시적인 오류가 발생했어요. 다시 시도해 주세요'),
    );
    expect(shell.appReady).toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: '초대장 확인하기' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith(CONTINUE));
  });

  it('확인하는 동안 숨김 안내와 함께 확인하기가 잠기고, 다시 눌러도 요청은 한 번이다', async () => {
    let calls = 0;
    let finish!: () => void;
    server.use(
      http.get('/api/invitations/:token', async () => {
        calls += 1;
        await new Promise<void>((resolve) => (finish = resolve));
        return ok({ name: '여행가조', introduction: '소개', code: 'ABCD2345' });
      }),
    );
    renderEntry();

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe('초대 링크를 확인하는 중이에요'),
    );
    const check = screen.getByRole('button', { name: '초대장 확인하기' });
    expect(check).toHaveProperty('disabled', true);
    await userEvent.click(check);

    finish();
    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
    expect(calls).toBe(1);
  });

  it('확인을 기다리는 중에 화면을 떠났다가 그대로 복원되면(bfcache) 잠금을 풀고 다시 누를 수 있다', async () => {
    server.use(http.get('/api/invitations/:token', () => new Promise<never>(() => {})));
    renderEntry();
    const check = () => screen.getByRole('button', { name: '초대장 확인하기' });
    await waitFor(() => expect(check()).toHaveProperty('disabled', true));

    // 복원이 아닌 일반 표시에서는 상태를 건드리지 않음
    act(() => {
      window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: false }));
    });
    expect(check()).toHaveProperty('disabled', true);

    act(() => {
      window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }));
    });
    await waitFor(() => expect(check()).toHaveProperty('disabled', false));
  });
});
