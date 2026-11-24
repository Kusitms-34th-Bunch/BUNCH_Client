import type * as DesignSystem from '@app/design-system';
import type { QueryObserverResult } from '@tanstack/react-query';
import { ApiError } from '@app/api-core';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BundleDetail } from '../model/bundle';
import { BUNDLE_MESSAGES } from '../constants/messages';
import { useDraftAutosave } from './useDraftAutosave';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@app/design-system', async (importOriginal) => ({
  ...(await importOriginal<typeof DesignSystem>()),
  toast,
}));

const detailAt = (revision: number, dateVersion: number) =>
  ({
    revision,
    dateVersion,
    comments: [{ memberId: 'me', version: 2 }],
  }) as unknown as BundleDetail;

const apiError = (status: number, code?: string) =>
  new ApiError({ message: 'x', category: status >= 500 ? 'server' : 'validation', status, code });

const setup = (overrides: { offline?: boolean } = {}) => {
  // 저장 루프가 읽고 쓰는 최신 상세(캐시 대신)
  const store = { detail: detailAt(1, 4) };
  const saveDate = vi.fn((_input: { value: string | null; expectedVersion: number }) =>
    Promise.resolve(detailAt(2, 5)),
  );
  const saveComment = vi.fn((_input: { value: string; expectedVersion: number }) =>
    Promise.resolve(detailAt(2, 4)),
  );
  const refetchDetail = vi.fn(() => {
    store.detail = detailAt(3, 9);
    return Promise.resolve({
      isError: false,
      data: store.detail,
    } as QueryObserverResult<BundleDetail>);
  });
  const hook = renderHook(() =>
    useDraftAutosave({
      readDetail: () => store.detail,
      writeDetail: (next) => {
        store.detail = next;
      },
      myIdRef: { current: 'me' },
      isOffline: () => overrides.offline === true,
      refetchDetail,
      saveTitle: vi.fn(() => Promise.resolve(store.detail)),
      saveDate,
      saveComment,
    }),
  );
  return { ...hook, store, saveDate, saveComment, refetchDetail };
};

beforeEach(() => {
  vi.useFakeTimers();
  toast.mockClear();
});
afterEach(() => vi.useRealTimers());

describe('useDraftAutosave', () => {
  it('예약한 시간 뒤 필드별 버전으로 저장하고 응답을 기준으로 삼은 뒤 입력 보관을 비운다', async () => {
    const { result, store, saveDate, saveComment } = setup();
    act(() => result.current.change(() => ({ date: '2026-11-24', comment: '좋아' })));
    act(() => result.current.schedule(500));

    await act(() => vi.advanceTimersByTimeAsync(499));
    expect(saveDate).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));

    expect(saveDate).toHaveBeenCalledWith(
      expect.objectContaining({ value: '2026-11-24', expectedVersion: 4 }),
    );
    // 코멘트 버전은 내 코멘트에서 찾음
    expect(saveComment).toHaveBeenCalledWith(
      expect.objectContaining({ value: '좋아', expectedVersion: 2 }),
    );
    expect(store.detail.revision).toBe(2);
    expect(result.current.pending).toEqual({});
  });

  it('버전 충돌이면 최신 상세를 받아 그 버전으로 곧 다시 저장한다', async () => {
    const { result, saveDate, refetchDetail } = setup();
    saveDate.mockRejectedValueOnce(apiError(409, 'BUNDLE_003'));
    act(() => result.current.change(() => ({ date: '2026-11-24' })));
    act(() => result.current.schedule(0));

    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(refetchDetail).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(200));

    expect(saveDate).toHaveBeenLastCalledWith(expect.objectContaining({ expectedVersion: 9 }));
    expect(result.current.pending).toEqual({});
  });

  it('권한·상태 오류는 포기하고 안내하며 입력은 남기고, 새로 입력하면 다시 저장한다', async () => {
    const { result, saveDate, refetchDetail } = setup();
    saveDate.mockRejectedValue(apiError(403));
    act(() => result.current.change(() => ({ date: '2026-11-24' })));
    act(() => result.current.schedule(0));
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(result.current.stalled).toBe(true);
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(BUNDLE_MESSAGES.saveFailed);
    expect(refetchDetail).toHaveBeenCalled();
    expect(result.current.pending).toEqual({ date: '2026-11-24' });

    saveDate.mockResolvedValue(detailAt(2, 5));
    act(() => result.current.change(() => ({ date: '2026-11-25' })));
    act(() => result.current.schedule(0));
    expect(result.current.stalled).toBe(false);
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(saveDate).toHaveBeenCalledTimes(2);
    expect(saveDate).toHaveBeenLastCalledWith(expect.objectContaining({ value: '2026-11-25' }));
    expect(result.current.pending).toEqual({});
  });

  it('일시 오류는 실패가 이어질수록 길게 기다리며 다시 저장한다', async () => {
    const { result, saveDate } = setup();
    saveDate.mockRejectedValueOnce(apiError(503)).mockRejectedValueOnce(apiError(503));
    act(() => result.current.change(() => ({ date: '2026-11-24' })));
    act(() => result.current.schedule(0));

    await act(() => vi.advanceTimersByTimeAsync(0));
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(saveDate).toHaveBeenCalledTimes(2);
    // 두 번째 실패 뒤에는 3초 × 2
    await act(() => vi.advanceTimersByTimeAsync(5999));
    expect(saveDate).toHaveBeenCalledTimes(2);
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(saveDate).toHaveBeenCalledTimes(3);
    expect(result.current.pending).toEqual({});
  });

  it('끊겨 있으면 보내지 않는다', async () => {
    const { result, saveDate } = setup({ offline: true });
    act(() => result.current.change(() => ({ date: '2026-11-24' })));
    act(() => result.current.schedule(0));
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(saveDate).not.toHaveBeenCalled();
  });

  it('discard하면 보관한 입력을 버려 예약한 시간이 지나도 저장하지 않는다', async () => {
    const { result, saveDate } = setup();
    act(() => result.current.change(() => ({ date: '2026-11-24' })));
    act(() => result.current.schedule(500));

    act(() => result.current.discard());
    await act(() => vi.advanceTimersByTimeAsync(1000));

    expect(result.current.pending).toEqual({});
    expect(saveDate).not.toHaveBeenCalled();
  });
});
