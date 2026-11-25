import { QueryObserver } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sharedKeys } from '@/shared/query/keys';
import { writeLocalOnly } from '@/shared/query/nativeTabSync';
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

  it('저장 전에 이 탭에만 먼저 쓴 값은 알리지 않고, 저장 뒤 같은 값을 쓰면 그때 알린다(번치 전환, #568)', () => {
    const client = renderSync(me('1'));
    writeLocalOnly(() => client.setQueryData(sharedKeys.me(), me('2')));
    expect(notifyNativeTabs).not.toHaveBeenCalled();

    client.setQueryData(sharedKeys.me(), me('2'));
    expect(notifyNativeTabs).toHaveBeenCalledTimes(1);
  });

  it('먼저 쓴 값을 되돌리면(저장 실패) 알리지 않는다', () => {
    const client = renderSync(me('1'));
    writeLocalOnly(() => client.setQueryData(sharedKeys.me(), me('2')));
    client.setQueryData(sharedKeys.me(), me('1'));
    expect(notifyNativeTabs).not.toHaveBeenCalled();
  });

  it('보이지 않는 탭(알림을 받고 다시 받은 탭)은 다시 알리지 않는다', () => {
    const client = renderSync();
    client.setQueryData(sharedKeys.me(), me('1'));
    setVisibility('hidden');
    client.setQueryData(sharedKeys.me(), me('2'));
    expect(notifyNativeTabs).not.toHaveBeenCalled();
  });

  it('다른 탭의 알림이면 내 정보 응답을 받은 뒤에만 나머지를 다시 받고, 자기 알림은 무시한다', async () => {
    const client = renderSync(me('1'));
    let resolveMe: (_value: ReturnType<typeof me>) => void = () => {};
    const meFn = vi
      .fn<() => Promise<ReturnType<typeof me>>>(() => Promise.resolve(me('2')))
      .mockImplementationOnce(() => new Promise((resolve) => (resolveMe = resolve)));
    const photosFn = vi.fn(() => Promise.resolve('photos'));
    client.setQueryData(['photos'], 'photos');
    // 화면에 붙은 쿼리(활성)처럼 구독. 저장된 값이 있어 구독만으로는 받지 않음
    const subscriptions = [
      new QueryObserver(client, { queryKey: sharedKeys.me(), queryFn: meFn, staleTime: Infinity }),
      new QueryObserver(client, { queryKey: ['photos'], queryFn: photosFn, staleTime: Infinity }),
    ].map((observer) => observer.subscribe(() => {}));
    const emit = (from: string) =>
      listeners.forEach((listener) => listener({ type: 'meChanged', from }));

    emit('bunch');
    expect(meFn).not.toHaveBeenCalled();

    emit('photos');
    await vi.waitFor(() => expect(meFn).toHaveBeenCalledTimes(1));
    expect(photosFn).not.toHaveBeenCalled();
    resolveMe(me('2'));
    await vi.waitFor(() => expect(photosFn).toHaveBeenCalledTimes(1));

    // 내 정보를 받지 못하면 나머지를 받지 않음(이전 번치 키에 새 번치 응답이 섞이지 않게)
    await vi.waitFor(() => expect(meFn).toHaveBeenCalledTimes(2)); // 나머지 무효화에 내 정보도 포함
    meFn.mockRejectedValueOnce(new Error('members/me 실패'));
    emit('photos');
    await vi.waitFor(() => expect(meFn).toHaveBeenCalledTimes(3));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(photosFn).toHaveBeenCalledTimes(1);
    subscriptions.forEach((unsubscribe) => unsubscribe());
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
