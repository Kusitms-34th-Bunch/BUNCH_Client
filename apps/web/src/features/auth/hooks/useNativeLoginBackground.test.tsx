import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNativeLoginBackground } from './useNativeLoginBackground';

const shell = vi.hoisted(() => ({
  native: true,
  setNativeLoginBackground: vi.fn<(_visible: boolean) => Promise<boolean>>(),
}));
vi.mock('@/shared/bridge/client', () => ({
  isNativeShell: () => shell.native,
  appBridge: { setNativeLoginBackground: shell.setNativeLoginBackground },
}));

const flush = () =>
  act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

describe('useNativeLoginBackground', () => {
  beforeEach(() => {
    shell.native = true;
    shell.setNativeLoginBackground.mockReset();
    // 걷기(false) 요청 등 따로 정하지 않은 호출의 답
    shell.setNativeLoginBackground.mockResolvedValue(true);
  });
  afterEach(() => vi.useRealTimers());

  it('쉘이 영상을 깔았다고 답하면 native, 그 전까지는 pending', async () => {
    shell.setNativeLoginBackground.mockResolvedValue(true);
    const { result } = renderHook(() => useNativeLoginBackground(false));

    expect(result.current).toBe('pending');
    expect(shell.setNativeLoginBackground).toHaveBeenCalledWith(true);
    await flush();
    expect(result.current).toBe('native');
  });

  it('쉘이 깔지 못한다고(탭 화면·안드로이드) 답하거나 오류면 웹 영상을 쓴다', async () => {
    shell.setNativeLoginBackground.mockResolvedValueOnce(false);
    const first = renderHook(() => useNativeLoginBackground(false));
    await waitFor(() => expect(first.result.current).toBe('web'));

    shell.setNativeLoginBackground.mockRejectedValueOnce(new Error('없는 메서드'));
    const second = renderHook(() => useNativeLoginBackground(false));
    await waitFor(() => expect(second.result.current).toBe('web'));
  });

  it('이전 쉘처럼 답이 없으면 1초 뒤 웹 영상을 쓴다', async () => {
    vi.useFakeTimers();
    shell.setNativeLoginBackground.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useNativeLoginBackground(false));
    expect(result.current).toBe('pending');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(result.current).toBe('web');
  });

  it('기다리다 웹 영상으로 정한 뒤 쉘이 늦게 깔았다고 답하면 바로 걷는다', async () => {
    vi.useFakeTimers();
    let answer!: (_shown: boolean) => void;
    shell.setNativeLoginBackground.mockReturnValueOnce(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    const { result } = renderHook(() => useNativeLoginBackground(false));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(result.current).toBe('web');

    await act(async () => {
      answer(true);
      await Promise.resolve();
    });
    expect(shell.setNativeLoginBackground).toHaveBeenLastCalledWith(false);
    expect(result.current).toBe('web');
  });

  it('화면을 떠나면 쉘의 영상을 걷는다', async () => {
    shell.setNativeLoginBackground.mockResolvedValue(true);
    const { unmount } = renderHook(() => useNativeLoginBackground(false));
    await flush();

    unmount();
    expect(shell.setNativeLoginBackground).toHaveBeenLastCalledWith(false);
  });

  it('동작 줄이기면 쉘에 영상을 요청하지 않고, 켜지면 깔았던 영상을 걷는다', async () => {
    shell.setNativeLoginBackground.mockResolvedValue(true);
    const { result, rerender } = renderHook(({ reduced }) => useNativeLoginBackground(reduced), {
      initialProps: { reduced: true },
    });
    expect(result.current).toBe('web');
    expect(shell.setNativeLoginBackground).not.toHaveBeenCalled();

    rerender({ reduced: false });
    await flush();
    expect(result.current).toBe('native');

    rerender({ reduced: true });
    expect(shell.setNativeLoginBackground).toHaveBeenLastCalledWith(false);
    expect(result.current).toBe('web');
  });

  it('브라우저(쉘 밖)에서는 묻지 않고 웹 영상을 쓴다', () => {
    shell.native = false;
    const { result } = renderHook(() => useNativeLoginBackground(false));

    expect(result.current).toBe('web');
    expect(shell.setNativeLoginBackground).not.toHaveBeenCalled();
  });
});
