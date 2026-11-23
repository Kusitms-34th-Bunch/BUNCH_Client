import { toast, Toaster } from '@app/design-system';
import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNativeToastPresenter } from '@/shared/hooks/native/useNativeToastPresenter';

const shell = vi.hoisted(() => ({ supported: true, answer: true }));
const listeners = vi.hoisted(() => new Set<(_event: { tab: string; id: string }) => void>());
const showNativeToast = vi.hoisted(() =>
  vi.fn((_params: unknown) => Promise.resolve(shell.answer)),
);
const hideNativeToast = vi.hoisted(() => vi.fn((_params: unknown) => Promise.resolve(true)));
vi.mock('@/shared/bridge/client', () => ({
  hasNativeMethod: (method: string) => shell.supported && method === 'showNativeToast',
  appBridge: {
    showNativeToast,
    hideNativeToast,
    addEventListener: (_name: string, listener: (_event: { tab: string; id: string }) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  },
}));

// 웹 토스트를 그렸는지는 실제 Toaster에 문구가 보이는지로 확인
const webToast = (message: string) => screen.findByText(message);
const noWebToast = async (message: string) => {
  await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
  expect(screen.queryByText(message)).toBeNull();
};

const pressAction = (tab: string, id: string) =>
  listeners.forEach((listener) => listener({ tab, id }));

afterEach(() => {
  showNativeToast.mockClear();
  hideNativeToast.mockClear();
  Object.assign(shell, { supported: true, answer: true });
});

describe('useNativeToastPresenter', () => {
  beforeEach(() => {
    render(<Toaster />);
  });

  it('켜져 있는 동안 아래쪽 토스트를 쉘로 보내고 웹 토스트는 그리지 않는다', async () => {
    const { unmount } = renderHook(() => useNativeToastPresenter('bunch', true));
    act(() => toast('번치로 전환했어요.'));

    const { id, ...params } = showNativeToast.mock.lastCall![0] as { id: string };
    expect(id).toMatch(/^bunch-\d+$/);
    expect(params).toEqual({
      tab: 'bunch',
      message: '번치로 전환했어요.',
      duration: 3000,
      fullWidth: true,
    });
    await noWebToast('번치로 전환했어요.');

    // 꺼지면 쉘 토스트를 닫고 다음 토스트는 웹으로
    unmount();
    expect(hideNativeToast).toHaveBeenCalledWith({ tab: 'bunch' });
    act(() => toast('웹으로'));
    expect(await webToast('웹으로')).toBeTruthy();
  });

  it('액션 버튼 눌림은 자기 탭의 지금 토스트일 때만 실행한다', () => {
    renderHook(() => useNativeToastPresenter('photos', true));
    const onClick = vi.fn();
    act(() => toast('날짜를 바꿨어요.', { action: { label: '되돌리기', onClick } }));
    expect(showNativeToast).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: { label: '되돌리기' }, duration: 5000 }),
    );
    const { id } = showNativeToast.mock.lastCall![0] as { id: string };

    pressAction('bunch', id);
    pressAction('photos', 'photos-0');
    expect(onClick).not.toHaveBeenCalled();
    pressAction('photos', id);
    pressAction('photos', id);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('위쪽 토스트는 웹으로 그린다', async () => {
    renderHook(() => useNativeToastPresenter('bunch', true));
    act(() => toast('입력 중 안내', { position: 'top' }));
    expect(showNativeToast).not.toHaveBeenCalled();
    expect(await webToast('입력 중 안내')).toBeTruthy();
  });

  it('쉘이 거절하면 같은 토스트를 웹으로 다시 띄운다', async () => {
    shell.answer = false;
    renderHook(() => useNativeToastPresenter('bunch', true));
    act(() => toast('저장했어요.'));
    expect(await webToast('저장했어요.')).toBeTruthy();
  });

  it('꺼져 있거나 이전 쉘이면 쉘을 부르지 않는다', async () => {
    const { unmount } = renderHook(() => useNativeToastPresenter('bunch', false));
    act(() => toast('꺼짐'));
    expect(await webToast('꺼짐')).toBeTruthy();
    unmount();
    shell.supported = false;
    renderHook(() => useNativeToastPresenter('bunch', true));
    act(() => toast('이전 쉘'));
    expect(await webToast('이전 쉘')).toBeTruthy();
    expect(showNativeToast).not.toHaveBeenCalled();
  });

  it('다시 등록해도 토스트 id가 겹치지 않아 늦게 온 액션 눌림이 새 토스트의 액션을 실행하지 않는다', () => {
    const first = renderHook(() => useNativeToastPresenter('photos', true));
    const oldAction = vi.fn();
    act(() => toast('이전', { action: { label: '되돌리기', onClick: oldAction } }));
    const { id: oldId } = showNativeToast.mock.lastCall![0] as { id: string };
    first.unmount();

    renderHook(() => useNativeToastPresenter('photos', true));
    const newAction = vi.fn();
    act(() => toast('새 토스트', { action: { label: '되돌리기', onClick: newAction } }));
    const { id: newId } = showNativeToast.mock.lastCall![0] as { id: string };

    expect(newId).not.toBe(oldId);
    pressAction('photos', oldId);
    expect(oldAction).not.toHaveBeenCalled();
    expect(newAction).not.toHaveBeenCalled();
  });
});
