import type { QueryObserverResult } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BundleDetail } from '../model/bundle';
import { useHeldEventResync } from './useHeldEventResync';

const detail = { id: '1', revision: 3 } as unknown as BundleDetail;
const ok = () =>
  Promise.resolve({ isError: false, data: detail } as QueryObserverResult<BundleDetail>);
const fail = () =>
  Promise.resolve({
    isError: true,
    data: undefined,
  } as unknown as QueryObserverResult<BundleDetail>);

const setup = (refetchDetail: () => Promise<QueryObserverResult<BundleDetail>>) => {
  const onResynced = vi.fn();
  const hook = renderHook(
    ({ busy }: { busy: boolean }) => useHeldEventResync({ busy, refetchDetail, onResynced }),
    { initialProps: { busy: true } },
  );
  return { ...hook, onResynced };
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useHeldEventResync', () => {
  it('보류한 이벤트가 없으면 요청이 끝나도 다시 받지 않는다', async () => {
    const refetch = vi.fn(ok);
    const { rerender } = setup(refetch);

    rerender({ busy: false });
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(refetch).not.toHaveBeenCalled();
  });

  it('요청 중에 보류한 이벤트가 있으면 요청이 끝난 뒤 한 번 다시 받고 받은 상세를 알린다', async () => {
    const refetch = vi.fn(ok);
    const { result, rerender, onResynced } = setup(refetch);
    act(() => result.current.markHeld());

    rerender({ busy: false });
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(refetch).toHaveBeenCalledTimes(1);
    expect(onResynced).toHaveBeenCalledWith(detail);
    expect(result.current.hasHeldEvent()).toBe(false);
  });

  it('받지 못하면 1초 간격으로 세 번까지 받아 보고 모두 실패하면 failed, 「재시도」로 받으면 풀린다', async () => {
    const refetch = vi.fn(fail);
    const { result, rerender } = setup(refetch);
    act(() => result.current.markHeld());
    rerender({ busy: false });

    await act(() => vi.advanceTimersByTimeAsync(0));
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(result.current.failed).toBe(false);
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(refetch).toHaveBeenCalledTimes(3);
    expect(result.current.failed).toBe(true);
    expect(result.current.isFailed()).toBe(true);
    // 보류 표시는 받을 때까지 남음
    expect(result.current.hasHeldEvent()).toBe(true);

    refetch.mockImplementation(ok);
    act(() => result.current.retry());
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(result.current.failed).toBe(false);
    expect(result.current.hasHeldEvent()).toBe(false);
  });

  it('다시 받는 중에 새 요청이 시작되면 그 결과는 버리고, 다시 한가해지면 처음부터 받는다', async () => {
    let resolveFirst: (_value: QueryObserverResult<BundleDetail>) => void = () => {};
    const refetch = vi
      .fn<() => Promise<QueryObserverResult<BundleDetail>>>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementation(ok);
    const { result, rerender, onResynced } = setup(refetch);
    act(() => result.current.markHeld());
    rerender({ busy: false });

    rerender({ busy: true });
    await act(async () => {
      resolveFirst({ isError: false, data: detail } as QueryObserverResult<BundleDetail>);
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(onResynced).not.toHaveBeenCalled();
    expect(result.current.hasHeldEvent()).toBe(true);

    rerender({ busy: false });
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(refetch).toHaveBeenCalledTimes(2);
    expect(onResynced).toHaveBeenCalledTimes(1);
  });
});
