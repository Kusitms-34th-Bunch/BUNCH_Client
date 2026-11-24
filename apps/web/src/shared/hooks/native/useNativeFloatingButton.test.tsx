import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useNativeFloatingButton } from '@/shared/hooks/native/useNativeFloatingButton';

type Shell = { native: boolean; tab: string | null; shown: boolean | undefined };
const shell = vi.hoisted((): Shell => ({ native: true, tab: 'bunch', shown: true }));
const listeners = vi.hoisted(() => new Set<(_event: { tab: string }) => void>());
const setNativeFloatingButton = vi.hoisted(() =>
  vi.fn((_params: unknown) => Promise.resolve(shell.shown)),
);
// 토스트 위임은 useNativeToastPresenter 테스트가 확인(여기서는 이전 쉘처럼 메서드 없음)
vi.mock('@/shared/bridge/client', () => ({
  hasNativeMethod: () => false,
  isNativeShell: () => shell.native,
  nativeShellTab: () => shell.tab,
  appBridge: {
    setNativeFloatingButton,
    addEventListener: (_name: string, listener: (_event: { tab: string }) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  },
}));

// 토스트를 쉘로 맡길지(useNativeToastPresenter의 켜짐 인자)만 기록
const toastPresenter = vi.hoisted(() => vi.fn());
vi.mock('@/shared/hooks/native/useNativeToastPresenter', () => ({
  useNativeToastPresenter: toastPresenter,
}));

const options = { tab: 'bunch', icon: 'add', label: '번들 만들기' } as const;
const press = (tab: string) => listeners.forEach((listener) => listener({ tab }));

afterEach(() => {
  setNativeFloatingButton.mockClear();
  Object.assign(shell, { native: true, tab: 'bunch', shown: true });
});

describe('useNativeFloatingButton', () => {
  it('브라우저에서는 쉘을 부르지 않고 웹 버튼을 그린다', () => {
    shell.native = false;
    const { result } = renderHook(() => useNativeFloatingButton(options));
    expect(result.current).toBe(true);
    expect(setNativeFloatingButton).not.toHaveBeenCalled();
  });

  it('쉘이 그리면 웹 버튼을 숨기고, 떠날 때 그 탭의 버튼을 지운다', async () => {
    const { result, unmount } = renderHook(() => useNativeFloatingButton(options));
    // 답을 받기 전에는 두 버튼이 겹치지 않게 숨김
    expect(result.current).toBe(false);
    await act(() => Promise.resolve());
    expect(result.current).toBe(false);
    expect(setNativeFloatingButton).toHaveBeenLastCalledWith({
      tab: 'bunch',
      button: { icon: 'add', label: '번들 만들기' },
    });

    unmount();
    expect(setNativeFloatingButton).toHaveBeenLastCalledWith({ tab: 'bunch', button: null });
  });

  it('다른 탭 WebView가 이 화면을 열면 쉘을 부르지 않고 웹 버튼을 그린다', () => {
    shell.tab = 'feed';
    const { result, unmount } = renderHook(() => useNativeFloatingButton(options));
    expect(result.current).toBe(true);
    unmount();
    expect(setNativeFloatingButton).not.toHaveBeenCalled();
  });

  it('쉘이 그리지 못하면(iOS 26 미만) 웹 버튼을 그린다', async () => {
    shell.shown = false;
    const { result } = renderHook(() => useNativeFloatingButton(options));
    await act(() => Promise.resolve());
    expect(result.current).toBe(true);
  });

  it('쉘이 제한 시간 안에 답하지 않으면 웹 버튼을 그린다', async () => {
    shell.shown = undefined;
    const { result } = renderHook(() => useNativeFloatingButton(options));
    await act(() => Promise.resolve());
    expect(result.current).toBe(true);
  });

  it('화면에 버튼이 없는 동안(hidden)은 네이티브 버튼을 지운다', async () => {
    const { rerender } = renderHook((props) => useNativeFloatingButton(props), {
      initialProps: { ...options, hidden: true },
    });
    await act(() => Promise.resolve());
    expect(setNativeFloatingButton).toHaveBeenLastCalledWith({ tab: 'bunch', button: null });
    rerender({ ...options, hidden: false });
    await act(() => Promise.resolve());
    expect(setNativeFloatingButton).toHaveBeenLastCalledWith({
      tab: 'bunch',
      button: { icon: 'add', label: '번들 만들기' },
    });
  });

  it('자기 탭의 눌림만 처리한다', async () => {
    const onPress = vi.fn();
    renderHook(() => useNativeFloatingButton({ ...options, onPress }));
    await act(() => Promise.resolve());
    press('photos');
    expect(onPress).not.toHaveBeenCalled();
    press('bunch');
    expect(onPress).toHaveBeenCalledOnce();
  });

  it('시트가 열린 동안 네이티브 버튼을 지우고 닫히면 다시 그린다', async () => {
    renderHook(() => useNativeFloatingButton(options));
    const sheet = document.createElement('div');
    sheet.setAttribute('role', 'dialog');
    await act(async () => {
      document.body.append(sheet);
      await Promise.resolve();
    });
    expect(setNativeFloatingButton).toHaveBeenLastCalledWith({ tab: 'bunch', button: null });
    await act(async () => {
      sheet.remove();
      await Promise.resolve();
    });
    expect(setNativeFloatingButton).toHaveBeenLastCalledWith({
      tab: 'bunch',
      button: { icon: 'add', label: '번들 만들기' },
    });
  });

  it('시트가 열려 버튼을 지운 동안에도 토스트는 계속 쉘로 맡긴다', async () => {
    renderHook(() => useNativeFloatingButton(options));
    await act(() => Promise.resolve());
    expect(toastPresenter).toHaveBeenLastCalledWith('bunch', true);
    const sheet = document.createElement('div');
    sheet.setAttribute('role', 'dialog');
    await act(async () => {
      document.body.append(sheet);
      await Promise.resolve();
    });
    expect(setNativeFloatingButton).toHaveBeenLastCalledWith({ tab: 'bunch', button: null });
    expect(toastPresenter).toHaveBeenLastCalledWith('bunch', true);
    sheet.remove();
  });
});
