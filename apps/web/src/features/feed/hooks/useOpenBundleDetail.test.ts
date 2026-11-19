import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FeedBundle } from '../lib/types';
import { getBundlePreview } from '../lib/bundlePreview';
import { useOpenBundleDetail } from './useOpenBundleDetail';

const push = vi.fn();
const prefetchDetail = vi.fn<() => Promise<unknown>>();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('../queries/bundleDetail', () => ({ usePrefetchBundleDetail: () => prefetchDetail }));

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
    expect(getBundlePreview('1', '7')).toBe(bundle);
    // 다른 번치의 같은 id는 미리 그리지 않음
    expect(getBundlePreview('2', '7')).toBeUndefined();
  });

  it('명의를 모르면 받지 않고 이동만 한다', () => {
    const { result } = renderHook(() => useOpenBundleDetail({ viewerId: undefined }));

    result.current.open(bundle, '/a');
    expect(push).toHaveBeenCalledWith('/a');
    expect(prefetchDetail).not.toHaveBeenCalled();
  });
});
