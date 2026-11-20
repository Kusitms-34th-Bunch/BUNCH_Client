import { ApiError } from '@app/api-core';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { type PrefetchBundle, useOpenBundle } from './useOpenBundle';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
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
const setup = (prefetchBundle: PrefetchBundle) => {
  const onDeleted = vi.fn();
  const { result } = renderHook(() => useOpenBundle({ viewerId: '1', prefetchBundle, onDeleted }));
  return { open: () => result.current('1', '7'), onDeleted };
};

describe('useOpenBundle', () => {
  it('상세가 400ms 안에 오지 않으면 확인 없이 이동하고, 늦은 404는 무시한다', async () => {
    let reject: (_error: unknown) => void = () => {};
    const { open, onDeleted } = setup(
      () =>
        new Promise((_, fail) => {
          reject = fail;
        }),
    );

    const opened = open();
    await act(() => vi.advanceTimersByTimeAsync(400));

    await expect(opened).resolves.toBe(false);
    expect(push).toHaveBeenCalledWith(HREF);
    reject(new ApiError({ message: 'gone', category: 'unknown', status: 404 }));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(toast).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('404가 아닌 실패는 이동해 상세 화면이 안내한다', async () => {
    const { open, onDeleted } = setup(() =>
      Promise.reject(new ApiError({ message: 'x', category: 'server', status: 500 })),
    );

    await act(async () => {
      await expect(open()).resolves.toBe(false);
    });

    expect(push).toHaveBeenCalledWith(HREF);
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('404면 이동하지 않고 안내 뒤 다시 받기를 부른다', async () => {
    const { open, onDeleted } = setup(() =>
      Promise.reject(new ApiError({ message: 'gone', category: 'unknown', status: 404 })),
    );

    await act(async () => {
      await expect(open()).resolves.toBe(true);
    });

    expect(push).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(BUNCH_HOME_MESSAGES.bundleDeleted);
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it('확인을 기다리는 동안 다시 누르면 한 번만 이동한다', async () => {
    let resolve: () => void = () => {};
    const prefetch = vi.fn<PrefetchBundle>(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    const { open } = setup(prefetch);

    const first = open();
    await expect(open()).resolves.toBe(false);
    resolve();
    await act(async () => {
      await first;
    });

    expect(prefetch).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('이동할 때 칸 데이터를 남기고, 삭제된 번들이면 남기지 않는다', async () => {
    const rememberPreview = vi.fn();
    const cell = { id: '7', title: '가을 소풍', coverSrc: '/a.jpg', bunchName: '여행쥬아' };
    const { result, rerender } = renderHook(
      ({ prefetchBundle }: { prefetchBundle: PrefetchBundle }) =>
        useOpenBundle({ viewerId: '1', prefetchBundle, rememberPreview, onDeleted: vi.fn() }),
      { initialProps: { prefetchBundle: () => Promise.resolve() } },
    );

    await act(() => result.current('1', '7', cell));
    expect(rememberPreview).toHaveBeenCalledWith('1', cell);
    expect(push).toHaveBeenCalledWith(HREF);

    rememberPreview.mockClear();
    rerender({
      prefetchBundle: () =>
        Promise.reject(new ApiError({ message: 'gone', category: 'unknown', status: 404 })),
    });
    await act(() => result.current('1', '7', cell));
    expect(rememberPreview).not.toHaveBeenCalled();
  });
});
