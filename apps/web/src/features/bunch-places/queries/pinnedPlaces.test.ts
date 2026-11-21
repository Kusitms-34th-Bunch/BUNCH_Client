import { describe, expect, it } from 'vitest';
import { MOCK_BUNCH_ID, MOCK_SECOND_BUNCH_ID } from '@/mocks/db/seed';
// 가짜 서버가 세션의 지금 번치를 돌려주는 동작에 기댐
import '@/mocks/server';
import { sharedKeys } from '@/shared/query/keys';
import { createTestQueryClient } from '@/shared/query/testing';
import { ALL_MEMBERS } from '../lib/types';
import { pinnedPlacesQueryOptions } from './pinnedPlaces';

describe('pinnedPlacesQueryOptions', () => {
  it('지금 번치의 첫 쪽은 그대로 받는다', async () => {
    const client = createTestQueryClient();

    const data = await client.fetchInfiniteQuery(
      pinnedPlacesQueryOptions(String(MOCK_BUNCH_ID), ALL_MEMBERS),
    );

    expect(data.pages[0]?.bunchId).toBe(String(MOCK_BUNCH_ID));
  });

  it('첫 쪽이 다른 번치 응답이면 그 목록 key에 넣지 않고 내 정보를 다시 받게 한다', async () => {
    const client = createTestQueryClient();
    client.setQueryData(sharedKeys.me(), { stale: false });
    const options = pinnedPlacesQueryOptions(String(MOCK_SECOND_BUNCH_ID), ALL_MEMBERS);

    await expect(client.fetchInfiniteQuery(options)).rejects.toThrow('pinned places bunch changed');
    expect(client.getQueryData(options.queryKey)).toBeUndefined();
    expect(client.getQueryState(sharedKeys.me())?.isInvalidated).toBe(true);
  });
});
