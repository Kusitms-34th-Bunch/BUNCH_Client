import { act, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NativeTabBarVisibility } from './NativeTabBarVisibility';

const setNativeTabBarVisible = vi.hoisted(() => vi.fn(() => Promise.resolve(true)));
vi.mock('@/shared/bridge/client', () => ({
  isNativeShell: () => true,
  appBridge: { setNativeTabBarVisible },
}));
const pathname = vi.hoisted(() => ({ current: '/bunch' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));

const setVisibility = (state: DocumentVisibilityState) =>
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });

afterEach(() => {
  setNativeTabBarVisible.mockClear();
  setVisibility('visible');
});

describe('NativeTabBarVisibility (iOS 쉘)', () => {
  it('탭 화면이면 표시하고 탭 밖 화면으로 가면 숨긴다', () => {
    pathname.current = '/bunch';
    const { rerender } = render(<NativeTabBarVisibility />);
    expect(setNativeTabBarVisible).toHaveBeenLastCalledWith(true);

    pathname.current = '/onboarding';
    rerender(<NativeTabBarVisibility />);
    expect(setNativeTabBarVisible).toHaveBeenLastCalledWith(false);
  });

  it('탭 화면이어도 시트·대화상자가 열린 동안에는 숨기고 닫히면 다시 표시한다', async () => {
    pathname.current = '/photos';
    render(<NativeTabBarVisibility />);
    expect(setNativeTabBarVisible).toHaveBeenLastCalledWith(true);

    const sheet = document.createElement('div');
    sheet.setAttribute('role', 'dialog');
    act(() => {
      document.body.append(sheet);
    });
    await waitFor(() => expect(setNativeTabBarVisible).toHaveBeenLastCalledWith(false));

    // 닫힘 애니메이션이 시작되면 요소가 사라지기 전이라도 바로 다시 표시
    act(() => {
      sheet.setAttribute('data-ending-style', '');
    });
    await waitFor(() => expect(setNativeTabBarVisible).toHaveBeenLastCalledWith(true));
    act(() => {
      sheet.remove();
    });
  });

  it('화면에 보이지 않는 탭 WebView는 보내지 않고, 다시 보이면 현재 상태를 보낸다', () => {
    setVisibility('hidden');
    pathname.current = '/photos/1';
    render(<NativeTabBarVisibility />);
    expect(setNativeTabBarVisible).not.toHaveBeenCalled();

    setVisibility('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(setNativeTabBarVisible).toHaveBeenLastCalledWith(false);
  });
});
