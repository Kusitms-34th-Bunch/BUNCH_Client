import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
// 가짜 서버 응답에 기대므로 직접 연결(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import '@/mocks/server';
import { MOCK_BUNCH_ID } from '@/mocks/db/seed';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import {
  bunchHomeQueryOptions,
  draftBundlesQueryOptions,
  LIVE_REFRESH,
  publishedBundlesQueryOptions,
  useRefetchListsOnCountChange,
} from '../queries/bunchHome';
import { useServerBunchHome } from './useServerBunchHome';

describe('useServerBunchHome', () => {
  it('홈 정보만 주기적으로 다시 받고, 번들 목록은 홈 개수가 바뀔 때만 다시 받는다', async () => {
    const client = createTestQueryClient();
    renderHook(() => useServerBunchHome(), { wrapper: createQueryWrapper(client) });
    const bunchId = String(MOCK_BUNCH_ID);
    const homeKey = bunchHomeQueryOptions(bunchId).queryKey;
    const draftsKey = draftBundlesQueryOptions(bunchId).queryKey;
    const optionsOf = (queryKey: readonly unknown[]) =>
      client.getQueryCache().find({ queryKey, exact: true })?.observers[0]?.options;

    await waitFor(() => expect(client.getQueryData(draftsKey)).toBeDefined());
    expect(optionsOf(homeKey)).toMatchObject(LIVE_REFRESH);
    expect(optionsOf(publishedBundlesQueryOptions(bunchId).queryKey)?.refetchInterval).toBeFalsy();
    expect(optionsOf(draftsKey)?.refetchInterval).toBeFalsy();

    // 다른 멤버가 초안을 만들어 홈 개수가 바뀜
    act(() => {
      client.setQueryData(homeKey, (home) =>
        home ? { ...home, draftCount: (home.draftCount ?? 0) + 1 } : home,
      );
    });

    await waitFor(() =>
      expect(client.getQueryState(draftsKey)?.dataUpdateCount).toBeGreaterThan(1),
    );
  });

  it('번치를 바꾼 직후 첫 값은 비교하지 않고, 같은 번치에서 멤버 수가 바뀌면 멤버만 다시 받는다', () => {
    const client = createTestQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const counts = { publishedCount: 1, draftCount: 0, memberCount: 2 };
    const { rerender } = renderHook(
      ({ bunchId, value }) => useRefetchListsOnCountChange(bunchId, value),
      { wrapper: createQueryWrapper(client), initialProps: { bunchId: '1', value: counts } },
    );

    rerender({ bunchId: '2', value: { publishedCount: 5, draftCount: 3, memberCount: 4 } });
    expect(invalidate).not.toHaveBeenCalled();

    rerender({ bunchId: '2', value: { publishedCount: 5, draftCount: 3, memberCount: 5 } });
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate.mock.calls[0]![0]).toEqual({ queryKey: ['bunch-members', '2'] });
  });
});
