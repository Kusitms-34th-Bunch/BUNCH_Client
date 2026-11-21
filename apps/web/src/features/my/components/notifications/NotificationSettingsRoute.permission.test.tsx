import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
// 가짜 서버 응답에 기대므로 직접 연결(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import '@/mocks/server';
import { createQueryWrapper } from '@/shared/query/testing';
import { NotificationSettingsRoute } from './NotificationSettingsRoute';

// 실제 `useDeviceNotificationPermission`을 쓰고 쉘 bridge만 대체해, 첫 확인(초기값 → 쉘 상태)이 변화 낭독으로 새지 않는지 확인
type Status = 'granted' | 'denied' | 'undetermined';
const bridge = vi.hoisted(() => ({
  getPermissionStatus: vi.fn<(_kind: string) => Promise<Status>>(),
  requestPermission: vi.fn<(_kind: string) => Promise<Status>>(),
}));
vi.mock('@/shared/bridge/client', () => ({
  isNativeShell: () => true,
  permissionBridge: {
    isNativeMethodAvailable: () => true,
    getPermissionStatus: bridge.getPermissionStatus,
    requestPermission: bridge.requestPermission,
  },
  // 권한을 답한 뒤 기기 다시 등록: 등록할 기기가 없는 쉘로 둠
  pushDeviceBridge: {
    isNativeMethodAvailable: () => true,
    getPushDeviceRegistration: () => Promise.resolve(null),
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
    // 들어올 때 이미 꺼져 있으면 초점을 옮기지 않음
    expect(document.activeElement).toBe(document.body);
    // 초기값(granted) → 첫 쉘 상태(denied)는 머무는 중 바뀐 것이 아니라 처음 상태
    expect(screen.queryByText(DEVICE_OFF_NOTICE)).toBeNull();
    expect(screen.queryByText(DEVICE_ON_NOTICE)).toBeNull();
  });

  it('첫 상태를 받기 전에는 토글을 잠가 두고, 켜짐이면 풀며 거부면 계속 잠근다', async () => {
    let resolveStatus: (_status: Status) => void = () => {};
    bridge.getPermissionStatus.mockImplementationOnce(
      () =>
        new Promise<Status>((resolve) => {
          resolveStatus = resolve;
        }),
    );
    render(<NotificationSettingsRoute />, { wrapper: createQueryWrapper() });
    const push = await screen.findByRole<HTMLInputElement>('switch', { name: '앱 푸시 알림' });

    // 권한이 꺼져 있는지 모르는 동안은 배너 없이 잠김
    expect(push.disabled).toBe(true);
    expect(screen.queryByText('알림 설정이 꺼져 있어요.')).toBeNull();

    await act(async () => {
      resolveStatus('denied');
      await Promise.resolve();
    });
    expect(await screen.findByText('알림 설정이 꺼져 있어요.')).toBeTruthy();
    expect(push.disabled).toBe(true);
  });

  it('첫 확인 결과가 켜짐이면 토글이 풀린다', async () => {
    bridge.getPermissionStatus.mockResolvedValue('granted');

    render(<NotificationSettingsRoute />, { wrapper: createQueryWrapper() });
    const push = await screen.findByRole<HTMLInputElement>('switch', { name: '앱 푸시 알림' });

    await waitFor(() => expect(push.disabled).toBe(false));
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

  it('권한을 아직 정하지 않은 기기는 알림을 끄고 다시 켜면 권한을 묻고 답한 상태로 바뀐다', async () => {
    bridge.getPermissionStatus.mockResolvedValue('undetermined');
    bridge.requestPermission.mockImplementation(() => {
      bridge.getPermissionStatus.mockResolvedValue('denied');
      return Promise.resolve('denied');
    });
    render(<NotificationSettingsRoute />, { wrapper: createQueryWrapper() });
    const push = await screen.findByRole<HTMLInputElement>('switch', { name: '앱 푸시 알림' });
    await waitFor(() => expect(push.disabled).toBe(false));

    // 끄는 것은 묻지 않음
    if (push.checked) fireEvent.click(push);
    await waitFor(() => expect(push.checked).toBe(false));
    expect(bridge.requestPermission).not.toHaveBeenCalled();

    // 키보드로 토글에 초점을 둔 채 켬(잠긴 뒤에도 초점이 토글에 남는 WebView 경로)
    push.focus();
    expect(document.activeElement).toBe(push);
    fireEvent.click(push);

    await waitFor(() => expect(bridge.requestPermission).toHaveBeenCalledWith('notification'));
    // 거부하면 바로 다시 읽어 배너를 띄우고, 잠긴 토글 대신 막힌 이유로 초점을 옮김
    const banner = await screen.findByText('알림 설정이 꺼져 있어요.');
    await waitFor(() => expect(document.activeElement).toBe(banner));
  });

  it('이미 허용한 기기는 알림을 켜도 다시 묻지 않는다', async () => {
    bridge.getPermissionStatus.mockResolvedValue('granted');
    render(<NotificationSettingsRoute />, { wrapper: createQueryWrapper() });
    const push = await screen.findByRole<HTMLInputElement>('switch', { name: '앱 푸시 알림' });
    await waitFor(() => expect(push.disabled).toBe(false));

    if (push.checked) fireEvent.click(push);
    await waitFor(() => expect(push.checked).toBe(false));
    fireEvent.click(push);
    await waitFor(() => expect(push.checked).toBe(true));

    expect(bridge.requestPermission).not.toHaveBeenCalled();
  });
});
