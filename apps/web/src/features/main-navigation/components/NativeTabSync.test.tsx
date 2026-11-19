import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sharedKeys } from '@/shared/query/keys';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { NativeTabSync } from './NativeTabSync';

const notifyNativeTabs = vi.hoisted(() => vi.fn(() => Promise.resolve(true)));
type Listener = (_event: { type: 'meChanged'; from: string }) => void;
const listeners = vi.hoisted(() => new Set<Listener>());
const shellTab = vi.hoisted((): { current: string | null } => ({ current: 'bunch' }));
vi.mock('@/shared/bridge/client', () => ({
  isNativeShell: () => true,
  nativeShellTab: () => shellTab.current,
  appBridge: {
    notifyNativeTabs,
    addEventListener: (_name: string, listener: Listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  },
}));

const setVisibility = (state: DocumentVisibilityState) =>
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
const me = (bunchId: string | null, nickname = '경준') => ({
  memberId: '1',
  nickname,
  imageSrc: null,
  bunch: bunchId === null ? null : { id: bunchId, name: '여행쥬아' },
});

afterEach(() => {
  notifyNativeTabs.mockClear();
  listeners.clear();
  shellTab.current = 'bunch';
  setVisibility('visible');
});

const renderSync = (cached?: ReturnType<typeof me>) => {
  const client = createTestQueryClient();
  if (cached) client.setQueryData(sharedKeys.me(), cached);
  render(<NativeTabSync />, { wrapper: createQueryWrapper(client) });
  return client;
};

describe('NativeTabSync (iOS 쉘 탭 WebView 사이)', () => {
  it('보이는 탭에서 지금 번치가 바뀌면 다른 탭에 알린다(처음 받은 값은 알리지 않음)', () => {
    const client = renderSync();
    client.setQueryData(sharedKeys.me(), me('1'));
    expect(notifyNativeTabs).not.toHaveBeenCalled();

    client.setQueryData(sharedKeys.me(), me('2'));
    expect(notifyNativeTabs).toHaveBeenCalledWith({ type: 'meChanged', from: 'bunch' });
  });

  it('구독 전에 받아 둔 값이 기준이고, 같은 값은 알리지 않으며 번치 없음·닉네임 변경도 알린다', () => {
    const client = renderSync(me('1'));
    client.setQueryData(sharedKeys.me(), me('1'));
    expect(notifyNativeTabs).not.toHaveBeenCalled();

    client.setQueryData(sharedKeys.me(), me(null));
    client.setQueryData(sharedKeys.me(), me(null, '새 닉네임'));
    expect(notifyNativeTabs).toHaveBeenCalledTimes(2);
  });

  it('보이지 않는 탭(알림을 받고 다시 받은 탭)은 다시 알리지 않는다', () => {
    const client = renderSync();
    client.setQueryData(sharedKeys.me(), me('1'));
    setVisibility('hidden');
    client.setQueryData(sharedKeys.me(), me('2'));
    expect(notifyNativeTabs).not.toHaveBeenCalled();
  });

  it('다른 탭의 알림이면 내 정보부터 다시 받고 나머지를 받으며, 자기가 보낸 알림은 무시한다', async () => {
    const client = renderSync();
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    listeners.forEach((listener) => listener({ type: 'meChanged', from: 'bunch' }));
    expect(invalidate).not.toHaveBeenCalled();

    listeners.forEach((listener) => listener({ type: 'meChanged', from: 'photos' }));
    await vi.waitFor(() => expect(invalidate).toHaveBeenCalledTimes(2));
    expect(invalidate.mock.calls[0]?.[0]).toEqual({ queryKey: sharedKeys.me() });
    expect(invalidate.mock.calls[1]?.[0]).toBeUndefined();
  });

  it('탭 화면 WebView가 아니면(첫 화면) 아무것도 하지 않는다', () => {
    shellTab.current = null;
    const client = renderSync();
    client.setQueryData(sharedKeys.me(), me('1'));
    client.setQueryData(sharedKeys.me(), me('2'));
    expect(notifyNativeTabs).not.toHaveBeenCalled();
    expect(listeners.size).toBe(0);
  });
});
