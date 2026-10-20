import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSION_RESPONSE_TIMEOUT_MS, usePermissionRequests } from './usePermissionRequests';

const bridge = vi.hoisted(() => ({
  isNative: true,
  available: true,
  requestPermission: vi.fn<(_kind: string) => Promise<string>>(),
}));
vi.mock('@/shared/bridge/client', () => ({
  isNativeShell: () => bridge.isNative,
  permissionBridge: {
    isNativeMethodAvailable: () => bridge.available,
    requestPermission: (kind: string) => bridge.requestPermission(kind),
  },
}));

describe('usePermissionRequests', () => {
  beforeEach(() => {
    bridge.isNative = true;
    bridge.available = true;
    bridge.requestPermission.mockReset();
    bridge.requestPermission.mockResolvedValue('granted');
  });

  it('사진 → 카메라 → 알림 순서로 하나씩 요청한다', async () => {
    const { result } = renderHook(() => usePermissionRequests());

    await act(() => result.current.requestAll());

    expect(bridge.requestPermission.mock.calls.map(([kind]) => kind)).toEqual([
      'photo',
      'camera',
      'notification',
    ]);
  });

  it('앞의 권한에 응답하기 전에는 다음 권한을 요청하지 않는다', async () => {
    let answer!: (_status: string) => void;
    bridge.requestPermission.mockImplementationOnce(
      () => new Promise((resolve) => (answer = resolve)),
    );
    const { result } = renderHook(() => usePermissionRequests());

    let done!: Promise<void>;
    act(() => {
      done = result.current.requestAll();
    });
    expect(bridge.requestPermission).toHaveBeenCalledTimes(1);
    expect(result.current.isRequesting).toBe(true);

    await act(async () => {
      answer('denied');
      await done;
    });
    expect(bridge.requestPermission).toHaveBeenCalledTimes(3);
    expect(result.current.isRequesting).toBe(false);
  });

  it('거부하거나 실패해도 나머지 권한 요청을 이어 간다', async () => {
    bridge.requestPermission.mockResolvedValueOnce('denied');
    bridge.requestPermission.mockRejectedValueOnce(new Error('실패'));
    const { result } = renderHook(() => usePermissionRequests());

    await act(() => result.current.requestAll());

    expect(bridge.requestPermission).toHaveBeenCalledTimes(3);
    expect(result.current.isRequesting).toBe(false);
  });

  it('요청이 진행 중일 때 다시 호출해도 중복 요청하지 않는다', async () => {
    let answer!: (_status: string) => void;
    bridge.requestPermission.mockImplementationOnce(
      () => new Promise((resolve) => (answer = resolve)),
    );
    const { result } = renderHook(() => usePermissionRequests());

    let first!: Promise<void>;
    act(() => {
      first = result.current.requestAll();
    });
    await act(() => result.current.requestAll());
    expect(bridge.requestPermission).toHaveBeenCalledTimes(1);

    await act(async () => {
      answer('granted');
      await first;
    });
  });

  it('응답이 오지 않아도 상한이 지나면 다음 권한으로 넘어가 끝난다', async () => {
    vi.useFakeTimers();
    try {
      bridge.requestPermission.mockImplementation(() => new Promise(() => undefined));
      const { result } = renderHook(() => usePermissionRequests());

      let done!: Promise<void>;
      act(() => {
        done = result.current.requestAll();
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(PERMISSION_RESPONSE_TIMEOUT_MS * 3);
        await done;
      });

      expect(bridge.requestPermission).toHaveBeenCalledTimes(3);
      expect(result.current.isRequesting).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    ['네이티브 쉘이 아니면', { isNative: false, available: true }],
    ['쉘이 권한 요청을 지원하지 않으면', { isNative: true, available: false }],
  ])('%s 요청하지 않고 지나간다', async (_name, state) => {
    Object.assign(bridge, state);
    const { result } = renderHook(() => usePermissionRequests());

    await act(() => result.current.requestAll());

    expect(bridge.requestPermission).not.toHaveBeenCalled();
    expect(result.current.isRequesting).toBe(false);
  });
});
