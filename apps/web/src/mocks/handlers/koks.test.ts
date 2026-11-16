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

    const kokCount = mockDb.get().koks.length;
    const pinned = await call<{ id: number }>('PUT', `/bundles/901/locations/${location.id}/pin`);
    expect(pinned.status).toBe(200);
    const again = await call<{ id: number }>('PUT', `/bundles/901/locations/${location.id}/pin`);
    expect(again.data.id).toBe(pinned.data.id);
    expect(mockDb.get().koks).toHaveLength(kokCount + 1);
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

  it('지운 콕의 ID를 새 콕에 다시 주지 않아, 늦게 온 옛 취소가 새 콕을 지우지 않는다', async () => {
    const location = (await firstLocation()).locations[0]!;
    const first = await call<{ id: number }>('PUT', `/bundles/901/locations/${location.id}/pin`);
    await call('DELETE', `/pinned-places/${first.data.id}`);
    const second = await call<{ id: number }>('PUT', `/bundles/901/locations/${location.id}/pin`);

    expect(second.data.id).not.toBe(first.data.id);
    expect((await call('DELETE', `/pinned-places/${first.data.id}`)).status).toBe(404);
    expect((await firstLocation()).locations[0]).toMatchObject({
      pinned: true,
      pinId: second.data.id,
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

type PinnedPlaces = {
  bunchId: number;
  selectedMemberId: number | null;
  totalCount: number;
  members: { memberId: number; nickname: string; count: number }[];
  items: {
    name: string;
    sourceType: string;
    sourceAccessible: boolean;
    sourceBunchName: string | null;
  }[];
  nextCursor: string | null;
};

describe('가짜 서버 콕한 장소 목록', () => {
  it('지금 번치의 콕을 최근 콕한 순으로, 멤버 칩은 지금 멤버 전원과 처음 콕한 수로 준다', async () => {
    const { status, data } = await call<PinnedPlaces>('GET', '/pinned-places?size=50');

    expect(status).toBe(200);
    expect(data.bunchId).toBe(MOCK_BUNCH_ID);
    // 나간 회원(101)의 콕도 전체 수에는 들어감
    expect(data.totalCount).toBe(7);
    expect(data.items.map((item) => item.name)).toEqual([
      '봄날카페',
      '계동 골목 식당',
      '안목해변 커피거리',
      '광안리 해변',
      '연남동 책방',
      '협재해변',
      '해리단길',
    ]);
    expect(data.members.map(({ nickname, count }) => [nickname, count])).toEqual([
      ['지예', 1],
      ['경진', 2],
      ['은우', 3],
      ['수인', 0],
      ['큐시즘', 0],
    ]);
  });

  it('출처: 볼 수 있는 번들은 번치 이름, 지워진 번들은 볼 수 없음, 광고는 ADVERTISEMENT', async () => {
    const { data } = await call<PinnedPlaces>('GET', '/pinned-places');
    const byName = (name: string) => data.items.find((item) => item.name === name);

    expect(byName('봄날카페')).toMatchObject({
      sourceAccessible: true,
      sourceBunchName: '캠핑러버',
    });
    expect(byName('안목해변 커피거리')).toMatchObject({
      sourceAccessible: false,
      sourceBunchName: null,
    });
    expect(byName('광안리 해변')).toMatchObject({ sourceType: 'ADVERTISEMENT' });
  });

  it('멤버로 거르고, 지금 멤버가 아니면 전체로 돌아가며, 쪽이 남으면 다음 커서를 준다', async () => {
    const filtered = (await call<PinnedPlaces>('GET', '/pinned-places?memberId=2')).data;
    expect(filtered.selectedMemberId).toBe(2);
    expect(filtered.items.map((item) => item.name)).toEqual(['광안리 해변', '연남동 책방']);
    expect(filtered.totalCount).toBe(7);

    const outsider = (await call<PinnedPlaces>('GET', '/pinned-places?memberId=101')).data;
    expect(outsider.selectedMemberId).toBeNull();
    expect(outsider.items).toHaveLength(7);

    const first = (await call<PinnedPlaces>('GET', '/pinned-places?size=5')).data;
    expect(first.items).toHaveLength(5);
    const next = (
      await call<PinnedPlaces>('GET', `/pinned-places?size=5&cursor=${first.nextCursor}`)
    ).data;
    expect(next.items.map((item) => item.name)).toEqual(['협재해변', '해리단길']);
    expect(next.nextCursor).toBeNull();
  });

  it('잘못된 쪽 크기는 COMMON_001, 소속 번치가 없으면 BUNCH_010', async () => {
    expect(await call('GET', '/pinned-places?size=51')).toMatchObject({
      status: 400,
      code: 'COMMON_001',
    });
    mockDb.update((state) => ({ ...state, memberships: [] }));
    expect(await call('GET', '/pinned-places')).toMatchObject({ status: 409, code: 'BUNCH_010' });
  });
});
