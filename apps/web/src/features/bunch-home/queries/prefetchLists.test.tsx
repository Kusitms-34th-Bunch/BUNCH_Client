import { renderHook, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { MOCK_BUNCH_ID, MOCK_SECOND_BUNCH_ID } from '@/mocks/db/seed';
import { fail } from '@/mocks/lib/envelope';
// 가짜 서버 응답에 기대므로 직접 연결(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import { server } from '@/mocks/server';
import { createQueryWrapper, createTestQueryClient } from '@/shared/query/testing';
import { bunchHomeKeys } from './keys';
import { usePrefetchMyBunchLists, usePrefetchOtherBunchLists } from './prefetchLists';

const MINE = String(MOCK_BUNCH_ID);
const OTHER = String(MOCK_SECOND_BUNCH_ID);

const setup = <T,>(hook: () => T) => {
  const client = createTestQueryClient();
  const { result } = renderHook(hook, { wrapper: createQueryWrapper(client) });
  return { client, result };
};

describe('목록 미리 받기', () => {
  it('내 번치 홈 뒤에는 화면과 같은 key에 팔로워·팔로잉·팔로우 요청·알림을 받아 둔다', async () => {
    const { client, result } = setup(usePrefetchMyBunchLists);

    result.current(MINE);

    for (const key of [
      bunchHomeKeys.followPages(MINE, MINE, 'followers'),
      bunchHomeKeys.followPages(MINE, MINE, 'following'),
      bunchHomeKeys.followRequests(MINE),
      bunchHomeKeys.notificationPages(MINE),
    ]) {
      await waitFor(() => expect(client.getQueryData(key)).toBeDefined());
    }
  });

  it('미리 받기에 실패해도 받아 둔 값을 남기지 않아, 화면에 들어가면 다시 받는다', async () => {
    server.use(http.get('/api/bunches/:bunchId/notifications', () => fail(500, 'X')));
    const { client, result } = setup(usePrefetchMyBunchLists);

    result.current(MINE);

    const key = bunchHomeKeys.notificationPages(MINE);
    await waitFor(() => expect(client.getQueryState(key)?.status).toBe('error'));
    expect(client.getQueryData(key)).toBeUndefined();
  });

  it('다른 번치는 볼 수 있는 목록만 받고, 볼 수 없는 팔로우 목록은 요청하지 않는다', async () => {
    const { client, result } = setup(usePrefetchOtherBunchLists);

    result.current(OTHER, MINE, { members: true, relations: false });

    await waitFor(() =>
      expect(client.getQueryData(bunchHomeKeys.otherBunchMembers(OTHER, MINE))).toBeDefined(),
    );
    expect(
      client.getQueryState(bunchHomeKeys.followPages(OTHER, MINE, 'followers')),
    ).toBeUndefined();
    expect(
      client.getQueryState(bunchHomeKeys.followPages(OTHER, MINE, 'following')),
    ).toBeUndefined();
  });
});
