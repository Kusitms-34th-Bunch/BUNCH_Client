import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { bunchHomeKeys } from './keys';
import { usePrefetchMyBunchLists, usePrefetchOtherBunchLists } from './prefetchLists';

const prefetchedKeys = (client: ReturnType<typeof createTestQueryClient>) => {
  const infinite = vi.spyOn(client, 'prefetchInfiniteQuery').mockResolvedValue();
  const plain = vi.spyOn(client, 'prefetchQuery').mockResolvedValue();
  return () =>
    [...infinite.mock.calls, ...plain.mock.calls].map(([options]) =>
      JSON.stringify(options.queryKey),
    );
};

describe('목록 미리 받기', () => {
  it('내 번치 홈 뒤에는 화면과 같은 key로 팔로워·팔로잉·팔로우 요청·알림을 받는다', () => {
    const client = createTestQueryClient();
    const keys = prefetchedKeys(client);
    const { result } = renderHook(usePrefetchMyBunchLists, {
      wrapper: createQueryWrapper(client),
    });

    result.current('1');

    expect(keys()).toEqual(
      expect.arrayContaining(
        [
          bunchHomeKeys.followPages('1', '1', 'followers'),
          bunchHomeKeys.followPages('1', '1', 'following'),
          bunchHomeKeys.followRequests('1'),
          bunchHomeKeys.notificationPages('1'),
        ].map((key) => JSON.stringify(key)),
      ),
    );
  });

  it('다른 번치는 볼 수 있는 목록만 받는다', () => {
    const client = createTestQueryClient();
    const keys = prefetchedKeys(client);
    const { result } = renderHook(usePrefetchOtherBunchLists, {
      wrapper: createQueryWrapper(client),
    });

    result.current('9', '1', { members: true, relations: false });

    expect(keys()).toEqual([JSON.stringify(bunchHomeKeys.otherBunchMembers('9', '1'))]);
  });
});
