import { beforeEach, describe, expect, it } from 'vitest';
import { mockDb } from '../db';
import { MOCK_BUNCH_ID, MOCK_SECOND_BUNCH_ID } from '../db/seed';
// handler 변경 때 PR CI(`--changed`)가 이 테스트를 고르게 서버를 import
import '@/mocks/server';

type Body<T> = { data: T; error: { code: string } | null };
type Ad = { id: number; pinned: boolean; pinId: number | null; canPin: boolean };

const call = async <T>(method: string, path: string) => {
  const response = await fetch(`/api${path}`, { method });
  const body = (await response.json()) as Body<T>;
  return { status: response.status, data: body.data, code: body.error?.code };
};

const feedAds = async () => {
  const feed = await call<{ items: { type: string; advertisement?: Ad }[] }>(
    'GET',
    '/feed?size=50',
  );
  return feed.data.items.flatMap((item) => (item.advertisement ? [item.advertisement] : []));
};

// 광고는 누적 번들 6개마다 와서, 901(공개 발행 번들)을 복사해 6개를 채움
beforeEach(() => {
  mockDb.update((state) => {
    const base = state.bundles.find((bundle) => bundle.id === 901)!;
    const copies = [1, 2, 3, 4, 5, 6].map((n) => ({
      ...base,
      id: 980 + n,
      publishedAt: new Date(Date.now() - n * 3_600_000).toISOString(),
    }));
    return { ...state, bundles: [...state.bundles, ...copies] };
  });
});

describe('가짜 서버 피드 광고', () => {
  it('콕하면 광고와 피드가 콕한 상태가 되고, 다시 콕해도 하나이며, 콕 취소로 빠진다', async () => {
    const pinned = await call<{ id: number }>('PUT', '/feed/advertisements/71/pin');
    expect(pinned.status).toBe(200);
    expect((await call<{ id: number }>('PUT', '/feed/advertisements/71/pin')).data.id).toBe(
      pinned.data.id,
    );
    expect(mockDb.get().koks).toHaveLength(1);
    expect((await call<Ad>('GET', '/feed/advertisements/71')).data).toMatchObject({
      pinned: true,
      pinId: pinned.data.id,
    });
    expect((await feedAds())[0]).toMatchObject({ pinned: true, pinId: pinned.data.id });

    expect((await call('DELETE', `/pinned-places/${pinned.data.id}`)).status).toBe(200);
    expect((await call<Ad>('GET', '/feed/advertisements/71')).data).toMatchObject({
      pinned: false,
      pinId: null,
    });
  });

  it('숨긴 광고는 피드에서 빠지고, 다시 숨겨도 성공한다', async () => {
    expect((await feedAds()).length).toBeGreaterThan(0);

    expect((await call('PUT', '/feed/advertisements/71/hide')).status).toBe(200);
    expect((await call('PUT', '/feed/advertisements/71/hide')).status).toBe(200);

    expect(await feedAds()).toEqual([]);
    expect(mockDb.get().hiddenAdIds).toEqual([71]);
  });

  it('없는 광고는 404, 소속 번치가 없으면 콕할 수 없다', async () => {
    expect(await call('PUT', '/feed/advertisements/1/pin')).toMatchObject({
      status: 404,
      code: 'RESOURCE_001',
    });
    mockDb.update((state) => ({
      ...state,
      memberships: state.memberships.filter(
        (item) => item.bunchId !== MOCK_BUNCH_ID && item.bunchId !== MOCK_SECOND_BUNCH_ID,
      ),
    }));
    expect((await call<Ad>('GET', '/feed/advertisements/71')).data.canPin).toBe(false);
    expect(await call('PUT', '/feed/advertisements/71/pin')).toMatchObject({
      status: 409,
      code: 'BUNCH_010',
    });
  });
});
