import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FeedBundle } from '../lib/types';
import { getBundlePreview } from '../lib/bundlePreview';
import { useOpenBundleDetail } from './useOpenBundleDetail';

const push = vi.fn();
const routePrefetch = vi.fn();
const prefetchDetail = vi.fn<() => Promise<unknown>>();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, prefetch: routePrefetch }) }));
vi.mock('../queries/bundleDetail', () => ({ usePrefetchBundleDetail: () => prefetchDetail }));
const prefetchComments = vi.fn<() => Promise<unknown>>(() => Promise.resolve());
vi.mock('../queries/comments', () => ({ usePrefetchComments: () => prefetchComments }));

const bundle = { id: '7', bunch: { id: '1' } } as FeedBundle;

describe('useOpenBundleDetail', () => {
  beforeEach(() => {
    push.mockReset();
    routePrefetch.mockReset();
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

  it('명의를 모르는 동안 미리 받으려던 카드는 명의가 확인되면 받는다(#573)', () => {
    prefetchDetail.mockReturnValue(Promise.resolve());
    const { result, rerender } = renderHook(
      ({ viewerId }: { viewerId: string | undefined }) => useOpenBundleDetail({ viewerId }),
      { initialProps: { viewerId: undefined as string | undefined } },
    );

    void result.current.prefetch(bundle);
    expect(prefetchDetail).not.toHaveBeenCalled();

    rerender({ viewerId: 'b1' });
    expect(prefetchDetail).toHaveBeenCalledWith('1', '7', 'b1');
    rerender({ viewerId: 'b1' });
    expect(prefetchDetail).toHaveBeenCalledTimes(1);
  });

  it('말풍선도 기다리지 않고 바로 이동하며, 말풍선 주소(query 포함)와 댓글 목록을 미리 받는다', () => {
    prefetchDetail.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useOpenBundleDetail({ viewerId: 'b1' }));

    result.current.open(bundle, '/a?focus=comments', { withComments: true });
    expect(push).toHaveBeenCalledWith('/a?focus=comments');
    expect(routePrefetch).toHaveBeenCalledWith('/bunches/1/bundles/7?focus=comments');
    expect(prefetchComments).toHaveBeenCalledWith('7', 'b1');
  });

  it('사진은 query 없는 상세 주소를 미리 받는다', () => {
    prefetchDetail.mockReturnValue(Promise.resolve());
    const { result } = renderHook(() => useOpenBundleDetail({ viewerId: 'b1' }));

    void result.current.prefetch(bundle);
    expect(routePrefetch).toHaveBeenCalledWith('/bunches/1/bundles/7');
  });
});
