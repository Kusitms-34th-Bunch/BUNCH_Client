import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDeviceNotificationPermission } from './useDeviceNotificationPermission';

type Status = 'granted' | 'denied' | 'undetermined';

const bridge = vi.hoisted(() => ({
  isNativeShell: vi.fn(() => true),
  isNativeMethodAvailable: vi.fn((_method: string) => true),
  getPermissionStatus: vi.fn<(_kind: string) => Promise<Status>>(),
  openAppSettings: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/shared/bridge/client', () => ({
  isNativeShell: bridge.isNativeShell,
  permissionBridge: {
    isNativeMethodAvailable: bridge.isNativeMethodAvailable,
    getPermissionStatus: bridge.getPermissionStatus,
  },
  photoUploadBridge: { openAppSettings: bridge.openAppSettings },
}));

beforeEach(() => {
  vi.clearAllMocks();
  bridge.isNativeShell.mockReturnValue(true);
  bridge.isNativeMethodAvailable.mockReturnValue(true);
  bridge.getPermissionStatus.mockResolvedValue('granted');
});

describe('useDeviceNotificationPermission', () => {
  it('브라우저에서는 읽지 않고 켜짐으로 두며 「설정으로 이동」도 주지 않는다', () => {
    bridge.isNativeShell.mockReturnValue(false);

    const { result } = renderHook(() => useDeviceNotificationPermission());

    expect(result.current.permission).toBe('granted');
    // 읽을 필요가 없는 브라우저는 처음부터 준비됨
    expect(result.current.ready).toBe(true);
    expect(result.current.openSettings).toBeUndefined();
    expect(bridge.getPermissionStatus).not.toHaveBeenCalled();
  });

  it('쉘에서는 첫 상태를 받기 전까지 확인 중이고, 받으면 끝난다', async () => {
    bridge.getPermissionStatus.mockResolvedValue('denied');

    const { result } = renderHook(() => useDeviceNotificationPermission());
    expect(result.current.checking).toBe(true);

    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.permission).toBe('denied');
  });

  it('브라우저에서는 확인할 것이 없어 확인 중이 아니다', () => {
    bridge.isNativeShell.mockReturnValue(false);

    const { result } = renderHook(() => useDeviceNotificationPermission());

    expect(result.current.checking).toBe(false);
  });

  it('상태를 읽지 못해도 확인 중으로 계속 막지 않는다', async () => {
    bridge.getPermissionStatus.mockRejectedValue(new Error('bridge down'));

    const { result } = renderHook(() => useDeviceNotificationPermission());

    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.permission).toBe('granted');
  });

  it('쉘이 읽기를 지원하지 않아 응답이 없으면 상한(1초)이 지나 확인 중을 푼다', () => {
    vi.useFakeTimers();
    try {
      bridge.isNativeMethodAvailable.mockReturnValue(false);

      const { result } = renderHook(() => useDeviceNotificationPermission());
      expect(result.current.checking).toBe(true);

      act(() => {
        vi.advanceTimersByTime(999);
      });
      expect(result.current.checking).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current.checking).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('쉘에서는 첫 상태를 받기 전까지 준비되지 않은 것으로 알린다', async () => {
    bridge.getPermissionStatus.mockResolvedValue('denied');

    const { result } = renderHook(() => useDeviceNotificationPermission());
    expect(result.current.ready).toBe(false);

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.permission).toBe('denied');
  });

  it('쉘에서 알림 권한을 거부했으면 꺼짐으로 보고, 알림 종류로 상태만 읽는다', async () => {
    bridge.getPermissionStatus.mockResolvedValue('denied');

    const { result } = renderHook(() => useDeviceNotificationPermission());

    await waitFor(() => expect(result.current.permission).toBe('denied'));
    expect(bridge.getPermissionStatus).toHaveBeenCalledWith('notification');
    expect(result.current.openSettings).toBeTypeOf('function');
  });

  it.each(['granted', 'undetermined'] as const)(
    '%s이면 배너로 막지 않고 켜짐으로 둔다',
    async (status) => {
      bridge.getPermissionStatus.mockResolvedValue(status);

      const { result } = renderHook(() => useDeviceNotificationPermission());

      await waitFor(() => expect(bridge.getPermissionStatus).toHaveBeenCalled());
      expect(result.current.permission).toBe('granted');
    },
  );

  it('쉘이 예상 밖 값을 돌려주면 정하지 않음으로 보고 켜짐으로 둔다', async () => {
    bridge.getPermissionStatus.mockResolvedValue('DENIED_FOREVER' as never);

    const { result } = renderHook(() => useDeviceNotificationPermission());

    await waitFor(() => expect(bridge.getPermissionStatus).toHaveBeenCalled());
    expect(result.current.permission).toBe('granted');
  });

  it('쉘이 bridge 메서드 목록을 알려 주기 전이면 잠시 뒤 다시 확인한다', async () => {
    bridge.isNativeMethodAvailable.mockReturnValueOnce(false).mockReturnValue(true);
    bridge.getPermissionStatus.mockResolvedValue('denied');

    const { result } = renderHook(() => useDeviceNotificationPermission());
    expect(bridge.getPermissionStatus).not.toHaveBeenCalled();

    await waitFor(() => expect(result.current.permission).toBe('denied'));
  });

  it('쉘이 상태 읽기를 지원하지 않으면(오래된 쉘) 몇 번 다시 확인해 보다 멈추고 계속 켜짐으로 둔다', () => {
    vi.useFakeTimers();
    try {
      bridge.isNativeMethodAvailable.mockReturnValue(false);

      const { result } = renderHook(() => useDeviceNotificationPermission());
      act(() => {
        vi.advanceTimersByTime(10_000);
      });

      expect(result.current.permission).toBe('granted');
      expect(result.current.ready).toBe(false);
      expect(bridge.getPermissionStatus).not.toHaveBeenCalled();
      // 처음 한 번과 다시 확인 10번뒤 멈춤
      expect(bridge.isNativeMethodAvailable).toHaveBeenCalledTimes(11);
    } finally {
      vi.useRealTimers();
    }
  });

  it('겹쳐 읽은 응답은 마지막 요청의 값만 반영한다(앞선 요청의 낡은 값이 나중에 와도 덮지 않음)', async () => {
    let resolveFirst: (_status: Status) => void = () => {};
    bridge.getPermissionStatus
      .mockImplementationOnce(
        () =>
          new Promise<Status>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValue('granted');
    const { result } = renderHook(() => useDeviceNotificationPermission());
    await waitFor(() => expect(bridge.getPermissionStatus).toHaveBeenCalledTimes(1));

    // 앱으로 돌아와 두 번째 읽기(최신: granted)가 먼저 끝나고, 앞선 읽기(낡은: denied)가 나중에 도착
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(async () => {
      resolveFirst('denied');
      await Promise.resolve();
    });

    expect(result.current.permission).toBe('granted');
  });

  it('앱으로 돌아오면(탭이 다시 보이면) 권한을 다시 확인해 배너를 없앤다', async () => {
    bridge.getPermissionStatus.mockResolvedValueOnce('denied').mockResolvedValue('granted');
    const { result } = renderHook(() => useDeviceNotificationPermission());
    await waitFor(() => expect(result.current.permission).toBe('denied'));

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => expect(result.current.permission).toBe('granted'));
    expect(bridge.getPermissionStatus).toHaveBeenCalledTimes(2);
  });

  it('상태를 읽지 못하면 이전 값을 유지하고 오류를 던지지 않는다', async () => {
    bridge.getPermissionStatus.mockRejectedValue(new Error('bridge down'));

    const { result } = renderHook(() => useDeviceNotificationPermission());

    await waitFor(() => expect(bridge.getPermissionStatus).toHaveBeenCalled());
    expect(result.current.permission).toBe('granted');
  });

  it('「설정으로 이동」은 앱 설정 화면을 연다', () => {
    const { result } = renderHook(() => useDeviceNotificationPermission());

    act(() => result.current.openSettings?.());

    expect(bridge.openAppSettings).toHaveBeenCalledTimes(1);
  });
});
