import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryWrapper } from '@/shared/query/testing';
import { NotificationSettingsRoute } from './NotificationSettingsRoute';

// 실제 `useDeviceNotificationPermission`을 쓰고 쉘 bridge만 대체해, 첫 확인(초기값 → 쉘 상태)이 변화 낭독으로 새지 않는지 확인
type Status = 'granted' | 'denied' | 'undetermined';
const bridge = vi.hoisted(() => ({
  getPermissionStatus: vi.fn<(_kind: string) => Promise<Status>>(),
}));
vi.mock('@/shared/bridge/client', () => ({
  isNativeShell: () => true,
  permissionBridge: {
    isNativeMethodAvailable: () => true,
    getPermissionStatus: bridge.getPermissionStatus,
  },
  photoUploadBridge: { openAppSettings: () => Promise.resolve() },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), back: vi.fn() }) }));

const DEVICE_OFF_NOTICE = '기기 알림이 꺼져 있어 알림 설정을 바꿀 수 없어요';
const DEVICE_ON_NOTICE = '기기 알림이 켜져서 알림 설정을 바꿀 수 있어요';

beforeEach(() => vi.clearAllMocks());

describe('NotificationSettingsRoute(실제 기기 권한 훅)', () => {
  it('쉘에서 권한이 이미 거부된 채 들어와도 배너만 보이고 변화 낭독은 하지 않는다', async () => {
    bridge.getPermissionStatus.mockResolvedValue('denied');

    render(<NotificationSettingsRoute />, { wrapper: createQueryWrapper() });

    expect(await screen.findByText('알림 설정이 꺼져 있어요.')).toBeTruthy();
    // 초기값(granted) → 첫 쉘 상태(denied)는 머무는 중 바뀐 것이 아니라 처음 상태
    expect(screen.queryByText(DEVICE_OFF_NOTICE)).toBeNull();
    expect(screen.queryByText(DEVICE_ON_NOTICE)).toBeNull();
  });

  it('첫 확인 뒤 설정에서 권한을 켜고 돌아오면 그때부터 변화를 낭독한다', async () => {
    bridge.getPermissionStatus.mockResolvedValueOnce('denied').mockResolvedValue('granted');
    render(<NotificationSettingsRoute />, { wrapper: createQueryWrapper() });
    await screen.findByText('알림 설정이 꺼져 있어요.');

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(await screen.findByText(DEVICE_ON_NOTICE)).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('알림 설정이 꺼져 있어요.')).toBeNull());
  });

  it('권한이 켜진 채 들어오면 아무 낭독도 하지 않는다', async () => {
    bridge.getPermissionStatus.mockResolvedValue('granted');

    render(<NotificationSettingsRoute />, { wrapper: createQueryWrapper() });
    await screen.findByRole('switch', { name: '앱 푸시 알림' });
    await waitFor(() => expect(bridge.getPermissionStatus).toHaveBeenCalled());

    expect(screen.queryByText(DEVICE_OFF_NOTICE)).toBeNull();
    expect(screen.queryByText(DEVICE_ON_NOTICE)).toBeNull();
  });
});
