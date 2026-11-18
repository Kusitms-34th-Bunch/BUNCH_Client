import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePushDeviceSync } from './usePushDeviceSync';

type Result = 'unavailable' | 'skipped' | 'synced' | 'failed';
const mocks = vi.hoisted(() => ({
  isNativeShell: vi.fn(() => true),
  syncPushDevice: vi.fn<() => Promise<Result>>(),
  resetPushDeviceSync: vi.fn(),
}));
vi.mock('../bridge/client', () => ({ isNativeShell: mocks.isNativeShell }));
vi.mock('../lib/pushDevice', () => ({
  syncPushDevice: mocks.syncPushDevice,
  resetPushDeviceSync: mocks.resetPushDeviceSync,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isNativeShell.mockReturnValue(true);
  mocks.syncPushDevice.mockResolvedValue('synced');
});
afterEach(() => vi.useRealTimers());

describe('usePushDeviceSync', () => {
  it('켜지지 않았거나(비로그인·가입 중) 쉘이 아니면 등록하지 않는다', () => {
    renderHook(() => usePushDeviceSync(null));
    expect(mocks.syncPushDevice).not.toHaveBeenCalled();

    mocks.isNativeShell.mockReturnValue(false);
    renderHook(() => usePushDeviceSync('1'));
    expect(mocks.syncPushDevice).not.toHaveBeenCalled();
  });

  it('회원이 바뀌거나 끝나면 등록 기록을 지우고 새 회원으로 다시 등록한다', () => {
    const { rerender, unmount } = renderHook(({ id }) => usePushDeviceSync(id), {
      initialProps: { id: '1' },
    });
    expect(mocks.syncPushDevice).toHaveBeenCalledTimes(1);

    rerender({ id: '2' });
    expect(mocks.resetPushDeviceSync).toHaveBeenCalledTimes(1);
    expect(mocks.syncPushDevice).toHaveBeenCalledTimes(2);

    unmount();
    expect(mocks.resetPushDeviceSync).toHaveBeenCalledTimes(2);
  });

  it('쉘에서 켜지면 한 번 등록한다', () => {
    renderHook(() => usePushDeviceSync('1'));

    expect(mocks.syncPushDevice).toHaveBeenCalledTimes(1);
  });

  it('앱으로 돌아오면(탭이 다시 보이거나 포커스) 다시 확인한다', async () => {
    renderHook(() => usePushDeviceSync('1'));

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });

    expect(mocks.syncPushDevice).toHaveBeenCalledTimes(3);
  });

  it('쉘이 아직 메서드 목록을 알려 주지 않았으면 잠시 뒤 다시 시도하다가 한도에서 멈춘다', async () => {
    vi.useFakeTimers();
    mocks.syncPushDevice.mockResolvedValue('unavailable');
    renderHook(() => usePushDeviceSync('1'));

    await vi.advanceTimersByTimeAsync(10_000);

    // 처음 한 번과 다시 시도 10번
    expect(mocks.syncPushDevice).toHaveBeenCalledTimes(11);
  });

  it('준비되자마자 등록되면 더 다시 시도하지 않는다', async () => {
    vi.useFakeTimers();
    mocks.syncPushDevice.mockResolvedValueOnce('unavailable').mockResolvedValue('synced');
    renderHook(() => usePushDeviceSync('1'));

    await vi.advanceTimersByTimeAsync(5000);

    expect(mocks.syncPushDevice).toHaveBeenCalledTimes(2);
  });

  it('사라지면 다시 시도와 이벤트 확인을 멈춘다', async () => {
    vi.useFakeTimers();
    mocks.syncPushDevice.mockResolvedValue('unavailable');
    const { unmount } = renderHook(() => usePushDeviceSync('1'));
    await vi.advanceTimersByTimeAsync(0);
    unmount();
    const calls = mocks.syncPushDevice.mock.calls.length;

    await vi.advanceTimersByTimeAsync(5000);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(mocks.syncPushDevice).toHaveBeenCalledTimes(calls);
  });

  it('등록 중 예상 밖 오류가 나도 던지지 않는다', async () => {
    mocks.syncPushDevice.mockRejectedValue(new Error('unexpected'));

    expect(() => renderHook(() => usePushDeviceSync('1'))).not.toThrow();
    await act(async () => {
      await Promise.resolve();
    });
  });
});
