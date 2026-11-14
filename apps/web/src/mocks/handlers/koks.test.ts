import { beforeEach, describe, expect, it } from 'vitest';
import { mockDb } from '../db';
import { MOCK_BUNCH_ID, MOCK_SECOND_BUNCH_ID } from '../db/seed';
// handler 변경 때 PR CI(`--changed`)가 이 테스트를 고르게 서버를 import
import '@/mocks/server';

type Body<T> = { data: T; error: { code: string } | null };
type Koks = { canPin: boolean; locations: { id: number; pinned: boolean; pinId: number | null }[] };

const call = async <T>(method: string, path: string) => {
  const response = await fetch(`/api${path}`, { method });
  const body = (await response.json()) as Body<T>;
  return { status: response.status, data: body.data, code: body.error?.code };
};

// 901: 시작 데이터의 공개 발행 번들. 시작 데이터에는 장소가 없어 하나 넣음
beforeEach(() => {
  mockDb.update((state) => ({
    ...state,
    bundles: state.bundles.map((bundle) =>
      bundle.id === 901
        ? {
            ...bundle,
            locations: [
              {
                provider: 'KAKAO',
                externalId: 'k-1',
                name: '애월 한담해변',
                address: '제주 제주시',
              },
            ],
          }
        : bundle,
    ),
  }));
});

const firstLocation = async () => (await call<Koks>('GET', '/bundles/901/pinned-places')).data;

describe('가짜 서버 번들 장소 콕', () => {
  it('콕하면 그 장소가 콕한 상태가 되고, 같은 장소를 다시 콕해도 하나이며, 취소하면 빠진다', async () => {
    const before = await firstLocation();
    expect(before.canPin).toBe(true);
    const location = before.locations[0]!;
    expect(location.pinned).toBe(false);

    const pinned = await call<{ id: number }>('PUT', `/bundles/901/locations/${location.id}/pin`);
    expect(pinned.status).toBe(200);
    const again = await call<{ id: number }>('PUT', `/bundles/901/locations/${location.id}/pin`);
    expect(again.data.id).toBe(pinned.data.id);
    expect(mockDb.get().koks).toHaveLength(1);
    expect((await firstLocation()).locations[0]).toMatchObject({
      pinned: true,
      pinId: pinned.data.id,
    });

    expect((await call('DELETE', `/pinned-places/${pinned.data.id}`)).status).toBe(200);
    expect((await firstLocation()).locations[0]).toMatchObject({ pinned: false, pinId: null });
    expect(await call('DELETE', `/pinned-places/${pinned.data.id}`)).toMatchObject({
      status: 404,
      code: 'RESOURCE_001',
    });
  });

  it('없는 장소는 404, 소속 번치가 없으면 콕할 수 없다', async () => {
    expect(await call('PUT', '/bundles/901/locations/1/pin')).toMatchObject({
      status: 404,
      code: 'RESOURCE_001',
    });
    const location = (await firstLocation()).locations[0]!;
    mockDb.update((state) => ({
      ...state,
      memberships: state.memberships.filter(
        (item) => item.bunchId !== MOCK_BUNCH_ID && item.bunchId !== MOCK_SECOND_BUNCH_ID,
      ),
    }));
    expect((await firstLocation()).canPin).toBe(false);
    expect(await call('PUT', `/bundles/901/locations/${location.id}/pin`)).toMatchObject({
      status: 409,
      code: 'BUNCH_010',
    });
  });
});
