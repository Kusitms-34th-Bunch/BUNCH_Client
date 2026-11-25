import { ApiError } from '@app/api-core';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { type PrefetchBundle, WARM_REUSE_MS, useOpenBundle } from './useOpenBundle';

const push = vi.fn();
const prefetchRoute = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, prefetch: prefetchRoute }) }));
const toast = vi.hoisted(() => vi.fn());
vi.mock('@app/design-system', () => ({ toast }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const HREF = '/bunches/1/bundles/7';
const gone = () => new ApiError({ message: 'gone', category: 'unknown', status: 404 });
const setup = (prefetchBundle: PrefetchBundle) => {
  const onDeleted = vi.fn();
  const rememberPreview = vi.fn();
  const { result } = renderHook(() =>
    useOpenBundle({ viewerId: '1', prefetchBundle, onDeleted, rememberPreview }),
  );
  return {
    open: (preview?: Parameters<typeof result.current.open>[2]) =>
      result.current.open('1', '7', preview),
    warm: () => result.current.warm('1', '7'),
    onDeleted,
    rememberPreview,
  };
};

describe('useOpenBundle', () => {
  it('누르면 상세 확인을 기다리지 않고 바로 이동한다(늦은 404는 상세 화면이 안내)', async () => {
    let reject: (_error: unknown) => void = () => {};
    const { warm, open, onDeleted } = setup(
      () =>
        new Promise((_, fail) => {
          reject = fail;
        }),
    );

    warm();
    expect(open()).toBe(false);
    expect(push).toHaveBeenCalledWith(HREF);

    reject(gone());
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(toast).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('닿을 때 시작한 확인이 누르기 전에 404로 끝났으면 이동하지 않고 안내 뒤 다시 받기를 부른다', async () => {
    const { warm, open, onDeleted, rememberPreview } = setup(() => Promise.reject(gone()));

    warm();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(open({ id: '7', title: '제목', coverSrc: '/a.jpg', bunchName: '번치' })).toBe(true);

    expect(push).not.toHaveBeenCalled();
    expect(rememberPreview).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(BUNCH_HOME_MESSAGES.bundleDeleted);
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it('404가 아닌 실패는 이동해 상세 화면이 안내한다', async () => {
    const { warm, open, onDeleted } = setup(() =>
      Promise.reject(new ApiError({ message: 'x', category: 'server', status: 500 })),
    );

    warm();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(open()).toBe(false);
    expect(push).toHaveBeenCalledWith(HREF);
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('이동할 때 칸 데이터를 남겨 상세가 먼저 그림', () => {
    const { open, rememberPreview } = setup(() => Promise.resolve());
    const preview = { id: '7', title: '제목', coverSrc: '/a.jpg', bunchName: '번치' };

    open(preview);
    expect(rememberPreview).toHaveBeenCalledWith('1', preview);
    expect(push).toHaveBeenCalledWith(HREF);
  });

  it('닿을 때 상세 주소와 상세를 미리 받고, 다시 닿아도 3초 안에는 다시 받지 않는다', async () => {
    const prefetch = vi.fn<PrefetchBundle>(() => Promise.resolve());
    const { warm } = setup(prefetch);

    warm();
    warm();
    expect(prefetchRoute).toHaveBeenCalledWith(HREF);
    expect(prefetch).toHaveBeenCalledTimes(1);

    await act(() => vi.advanceTimersByTimeAsync(WARM_REUSE_MS));
    warm();
    expect(prefetch).toHaveBeenCalledTimes(2);
  });

  it('누른 뒤 다음 누름은 앞선 확인 결과를 쓰지 않는다', async () => {
    let first = true;
    const { warm, open } = setup(() => {
      if (first) {
        first = false;
        return Promise.reject(gone());
      }
      return Promise.resolve();
    });

    warm();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(open()).toBe(true);
    // 다시 누르면(닿음 없이) 지난 404를 쓰지 않고 이동
    expect(open()).toBe(false);
    expect(push).toHaveBeenCalledWith(HREF);
  });

  it('같은 칸을 빠르게 두 번 누르면 한 번만 이동한다', () => {
    const { open } = setup(() => Promise.resolve());

    open();
    open();
    expect(push).toHaveBeenCalledTimes(1);
  });
});
