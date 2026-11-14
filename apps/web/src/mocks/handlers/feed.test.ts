import { describe, expect, it } from 'vitest';
import type { MockBundle } from '../db/types';
import { mockDb } from '../db';
import { MOCK_BUNCH_ID } from '../db/seed';
// handler 변경 때 PR CI(`--changed`)가 이 테스트를 고르게 서버를 import
import '@/mocks/server';

type FeedItem = { type: string; segment?: string; bundle?: { id: number; bunch: { id: number } } };
type FeedPage = {
  currentBunchId: number | null;
  canInteract: boolean;
  items: FeedItem[];
  nextCursor: string | null;
  hasNext: boolean;
  endReached: boolean;
};

const getFeed = async (query = '') => {
  const response = await fetch(`/api/feed${query}`);
  const body = (await response.json()) as { data: FeedPage; error: { code: string } | null };
  return { status: response.status, data: body.data, code: body.error?.code };
};
const bundleIds = (page: FeedPage) =>
  page.items.flatMap((item) => (item.bundle ? [item.bundle.id] : []));

// 공개 번치(3)의 PUBLIC 번들 복제본(발행 시각만 다름)
const publicCopy = (id: number, hoursAgo: number, bunchId = 3): MockBundle => {
  const base = mockDb.get().bundles.find((bundle) => bundle.id === 901)!;
  return {
    ...base,
    id,
    bunchId,
    publishedAt: new Date(Date.now() - hoursAgo * 3_600_000).toISOString(),
  };
};

describe('가짜 서버 피드', () => {
  it('공개 번치의 공개 번들만 최신순으로 주고, 내 번치·비공개 번치의 번들은 뺀다', async () => {
    const { status, data } = await getFeed();

    expect(status).toBe(200);
    expect(bundleIds(data)).toEqual([901, 902]);
    expect(data.items.every((item) => item.segment === 'PUBLIC')).toBe(true);
    expect(data).toMatchObject({
      currentBunchId: MOCK_BUNCH_ID,
      canInteract: true,
      endReached: true,
    });
  });

  it('최근 14일 안의 팔로우한 번치 번들이 먼저 오고 그 뒤에 구간 끝 안내가 한 번 온다', async () => {
    mockDb.update((state) => ({
      ...state,
      follows: [
        ...state.follows,
        {
          id: 999,
          followerBunchId: MOCK_BUNCH_ID,
          targetBunchId: 4,
          status: 'FOLLOWING',
          createdAt: '2026-10-20T09:00:00.000Z',
        },
      ],
      bundles: [...state.bundles, publicCopy(950, 2, 4)],
    }));

    const { data } = await getFeed();

    expect(data.items.map((item) => item.type)).toEqual([
      'BUNDLE',
      'FOLLOWING_CAUGHT_UP',
      'BUNDLE',
      'BUNDLE',
    ]);
    expect(data.items[0]).toMatchObject({ segment: 'FOLLOWING', bundle: { id: 950 } });
  });

  it('누적 번들 6개마다 광고를 넣고, 커서로 다음 쪽을 이어 준다', async () => {
    mockDb.update((state) => ({
      ...state,
      bundles: [...state.bundles, ...[1, 2, 3, 4, 5].map((n) => publicCopy(960 + n, n))],
    }));

    const first = await getFeed('?size=4');
    expect(bundleIds(first.data)).toHaveLength(4);
    expect(first.data.items.some((item) => item.type === 'ADVERTISEMENT')).toBe(false);
    expect(first.data.hasNext).toBe(true);

    const second = await getFeed(`?size=4&cursor=${encodeURIComponent(first.data.nextCursor!)}`);
    expect(second.data.items.map((item) => item.type)).toEqual([
      'BUNDLE',
      'BUNDLE',
      'ADVERTISEMENT',
      'BUNDLE',
    ]);
    expect(second.data.endReached).toBe(true);
  });

  it('커서를 받은 뒤 승인 팔로우가 바뀌면 FEED_001(409), 해석할 수 없는 커서와 범위 밖 size는 400이다', async () => {
    mockDb.update((state) => ({ ...state, bundles: [...state.bundles, publicCopy(970, 1)] }));
    const first = await getFeed('?size=1');
    mockDb.update((state) => ({
      ...state,
      follows: [
        ...state.follows,
        {
          id: 998,
          followerBunchId: MOCK_BUNCH_ID,
          targetBunchId: 3,
          status: 'FOLLOWING',
          createdAt: '2026-11-01T09:00:00.000Z',
        },
      ],
    }));

    const stale = await getFeed(`?size=1&cursor=${encodeURIComponent(first.data.nextCursor!)}`);
    expect(stale).toMatchObject({ status: 409, code: 'FEED_001' });
    expect(await getFeed('?cursor=broken')).toMatchObject({ status: 400, code: 'COMMON_001' });
    expect(await getFeed('?size=51')).toMatchObject({ status: 400, code: 'COMMON_001' });
  });
});
