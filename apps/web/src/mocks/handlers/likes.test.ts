import { describe, expect, it } from 'vitest';
import { mockDb } from '../db';
import { MOCK_BUNCH_ID, MOCK_SECOND_BUNCH_ID } from '../db/seed';
// handler 변경 때 PR CI(`--changed`)가 이 테스트를 고르게 서버를 import
import '@/mocks/server';

type LikeBody = {
  data: {
    bundleId: number;
    currentBunchId: number;
    likedByCurrentBunch: boolean;
    likeCount: number;
  };
  error: { code: string } | null;
};

const like = async (bundleId: number | string, method: 'PUT' | 'DELETE') => {
  const response = await fetch(`/api/bundles/${bundleId}/like`, { method });
  const body = (await response.json()) as LikeBody;
  return { status: response.status, data: body.data, code: body.error?.code };
};

describe('가짜 서버 번들 좋아요', () => {
  it('지금 번치 명의로 켜고 끄며, 같은 요청을 반복해도 한 번만 센다', async () => {
    // 901: 시작 데이터에서 다른 번치 둘이 누른 공개 번들
    expect(await like(901, 'PUT')).toMatchObject({
      status: 200,
      data: {
        bundleId: 901,
        currentBunchId: MOCK_BUNCH_ID,
        likedByCurrentBunch: true,
        likeCount: 3,
      },
    });
    expect((await like(901, 'PUT')).data.likeCount).toBe(3);
    expect((await like(901, 'DELETE')).data).toMatchObject({
      likedByCurrentBunch: false,
      likeCount: 2,
    });
    // 기록이 없어도 취소는 성공
    expect((await like(901, 'DELETE')).status).toBe(200);
  });

  it('지금 번치의 멤버 공개 번들도 누를 수 있고, 누른 값은 피드 응답에 반영된다', async () => {
    const own = mockDb
      .get()
      .bundles.find((bundle) => bundle.bunchId === MOCK_BUNCH_ID && bundle.status === 'PUBLISHED')!;
    expect(await like(own.id, 'PUT')).toMatchObject({ status: 200 });
    await like(901, 'PUT');

    const feed = (await (await fetch('/api/feed')).json()) as {
      data: {
        items: { bundle?: { id: number; likeCount: number; likedByCurrentBunch: boolean } }[];
      };
    };
    const card = feed.data.items.find((item) => item.bundle?.id === 901)?.bundle;
    expect(card).toMatchObject({ likeCount: 3, likedByCurrentBunch: true });
  });

  it('승인 안 된 비공개 번치, 없는 번들, 소속 번치 없음, 잘못된 ID는 오류다', async () => {
    expect(await like(911, 'PUT')).toMatchObject({ status: 403, code: 'AUTH_002' });
    expect(await like(99999, 'PUT')).toMatchObject({ status: 404, code: 'RESOURCE_001' });
    expect(await like('x', 'PUT')).toMatchObject({ status: 400, code: 'COMMON_001' });

    mockDb.update((state) => ({
      ...state,
      memberships: state.memberships.filter(
        (item) => item.bunchId !== MOCK_BUNCH_ID && item.bunchId !== MOCK_SECOND_BUNCH_ID,
      ),
    }));
    expect(await like(901, 'PUT')).toMatchObject({ status: 409, code: 'BUNCH_010' });
  });
});
