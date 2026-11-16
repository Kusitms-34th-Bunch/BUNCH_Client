import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FeedBundle } from '../lib/types';
import { useOpenBundleDetail } from './useOpenBundleDetail';

const push = vi.fn();
const prefetchDetail = vi.fn<() => Promise<unknown>>();
let reducedMotion = false;
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/shared/hooks/useReducedMotion', () => ({ useReducedMotion: () => reducedMotion }));
vi.mock('../queries/bundleDetail', () => ({ usePrefetchBundleDetail: () => prefetchDetail }));

const bundle = { id: '7', bunch: { id: '1' } } as FeedBundle;
const flush = () => act(async () => {});

describe('useOpenBundleDetail', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    push.mockReset();
    prefetchDetail.mockReset();
    reducedMotion = false;
  });
  afterEach(() => vi.useRealTimers());

  it('상세를 받은 뒤 이동하고, 기다리는 동안 다시 누르면 무시한다', async () => {
    let resolve = () => {};
    prefetchDetail.mockReturnValue(new Promise<void>((done) => (resolve = done)));
    const { result } = renderHook(() => useOpenBundleDetail({ viewerId: 'b1' }));

    result.current.open(bundle, '/a');
    result.current.open(bundle, '/b');
    await flush();
    expect(push).not.toHaveBeenCalled();

    resolve();
    await flush();
    expect(push.mock.calls).toEqual([['/a']]);
    expect(prefetchDetail).toHaveBeenCalledWith('1', '7', 'b1');
  });

  it('받기가 400ms를 넘으면 기다리지 않고 이동한다', async () => {
    prefetchDetail.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useOpenBundleDetail({ viewerId: null }));

    result.current.open(bundle, '/a');
    await act(() => vi.advanceTimersByTimeAsync(399));
    expect(push).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(push).toHaveBeenCalledWith('/a');
  });

  it('기다리는 사이 화면을 떠나면 이동하지 않는다', async () => {
    prefetchDetail.mockReturnValue(new Promise(() => {}));
    const { result, unmount } = renderHook(() => useOpenBundleDetail({ viewerId: null }));

    result.current.open(bundle, '/a');
    unmount();
    await act(() => vi.advanceTimersByTimeAsync(400));
    expect(push).not.toHaveBeenCalled();
  });

  it('동작 줄이기면 미리 받지 않고 바로 이동한다', () => {
    reducedMotion = true;
    const { result } = renderHook(() => useOpenBundleDetail({ viewerId: null }));

    result.current.open(bundle, '/a');
    expect(push).toHaveBeenCalledWith('/a');
    expect(prefetchDetail).not.toHaveBeenCalled();
  });
});
