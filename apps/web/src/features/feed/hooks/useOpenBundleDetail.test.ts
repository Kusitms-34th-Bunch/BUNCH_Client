import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FeedBundle } from '../lib/types';
import { getBundlePreview } from '../lib/bundlePreview';
import { useOpenBundleDetail } from './useOpenBundleDetail';

const push = vi.fn();
const prefetchDetail = vi.fn<() => Promise<unknown>>();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, prefetch: vi.fn() }) }));
vi.mock('../queries/bundleDetail', () => ({ usePrefetchBundleDetail: () => prefetchDetail }));
const prefetchComments = vi.fn<() => Promise<unknown>>(() => Promise.resolve());
vi.mock('../queries/comments', () => ({ usePrefetchComments: () => prefetchComments }));

const bundle = { id: '7', bunch: { id: '1' } } as FeedBundle;

describe('useOpenBundleDetail', () => {
  beforeEach(() => {
    push.mockReset();
    prefetchDetail.mockReset();
  });

  it('상세를 기다리지 않고 바로 이동하며, 받기를 시작하고 카드 데이터를 기억한다', () => {
    prefetchDetail.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useOpenBundleDetail({ viewerId: 'b1' }));

    result.current.open(bundle, '/a');
    expect(push).toHaveBeenCalledWith('/a');
    expect(prefetchDetail).toHaveBeenCalledWith('1', '7', 'b1');
    expect(getBundlePreview('1', '7')).toEqual({ bundle, partial: false });
    // 다른 번치의 같은 id는 미리 그리지 않음
    expect(getBundlePreview('2', '7')).toBeUndefined();
  });

  it('명의를 모르면 받지 않고 이동만 한다', () => {
    const { result } = renderHook(() => useOpenBundleDetail({ viewerId: undefined }));

    result.current.open(bundle, '/a');
    expect(push).toHaveBeenCalledWith('/a');
    expect(prefetchDetail).not.toHaveBeenCalled();
  });

  it('waitMs를 주면 상세를 받을 때까지 기다렸다가 이동하고, 기다리는 동안 다시 누른 것은 무시한다', async () => {
    let resolve = () => {};
    prefetchDetail.mockReturnValue(
      new Promise<void>((done) => {
        resolve = done;
      }),
    );
    const { result } = renderHook(() => useOpenBundleDetail({ viewerId: 'b1' }));

    result.current.open(bundle, '/c', { waitMs: 400, withComments: true });
    result.current.open(bundle, '/c', { waitMs: 400, withComments: true });
    expect(push).not.toHaveBeenCalled();
    expect(prefetchComments).toHaveBeenCalledWith('7', 'b1');
    resolve();
    await vi.waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(push).toHaveBeenCalledWith('/c');
  });

  it('waitMs가 지나도 받지 못했으면 그대로 이동한다', () => {
    vi.useFakeTimers();
    try {
      prefetchDetail.mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useOpenBundleDetail({ viewerId: 'b1' }));

      result.current.open(bundle, '/c', { waitMs: 400 });
      vi.advanceTimersByTime(399);
      expect(push).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(push).toHaveBeenCalledWith('/c');
    } finally {
      vi.useRealTimers();
    }
  });

  it('기다리는 사이 사진을 누르거나 다른 화면·숨은 탭이 되거나 화면이 사라지면 기다리던 이동은 하지 않는다', () => {
    vi.useFakeTimers();
    try {
      prefetchDetail.mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useOpenBundleDetail({ viewerId: 'b1' }));

      result.current.open(bundle, '/c', { waitMs: 400 });
      result.current.open(bundle, '/a');
      vi.advanceTimersByTime(400);
      expect(push.mock.calls).toEqual([['/a']]);

      push.mockReset();
      result.current.open(bundle, '/c', { waitMs: 400 });
      window.history.pushState(null, '', '/bunch');
      vi.advanceTimersByTime(400);
      expect(push).not.toHaveBeenCalled();

      const hidden = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
      result.current.open(bundle, '/c', { waitMs: 400 });
      vi.advanceTimersByTime(400);
      hidden.mockRestore();
      expect(push).not.toHaveBeenCalled();

      const { result: other, unmount } = renderHook(() => useOpenBundleDetail({ viewerId: 'b1' }));
      other.current.open(bundle, '/c', { waitMs: 400 });
      unmount();
      vi.advanceTimersByTime(400);
      expect(push).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
