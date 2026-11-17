import { describe, expect, it } from 'vitest';
// 가짜 서버 응답에 기대므로 직접 연결(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import '../server';
import { mockDb } from '../db';
import { MOCK_BUNCH_ID, MOCK_EXTERNAL_BUNCH_IDS, MOCK_SECOND_BUNCH_ID } from '../db/seed';

// 내 번치(여행쥬아)가 다른 번치 3·4를 팔로우한 관계(시작 데이터의 목록용 관계는 제외)
const myExternalFollows = () =>
  mockDb
    .get()
    .follows.filter(
      (follow) =>
        follow.followerBunchId === MOCK_BUNCH_ID &&
        (follow.targetBunchId === 3 || follow.targetBunchId === 4),
    );

type Envelope<T> = { success: boolean; data: T; error: { code: string } | null };
const call = async <T>(method: string, path: string) => {
  const response = await fetch(path, { method });
  return { status: response.status, json: (await response.json()) as Envelope<T> };
};
type Follow = { followState: string; followId: number };
type Home = {
  accessScope: string;
  followState: string;
  followId: number | null;
  canViewBundles: boolean;
  followerCount: number;
  myMembership: unknown;
  isCurrentBunch: boolean;
};

const { public: PUBLIC_ID, private: PRIVATE_ID } = MOCK_EXTERNAL_BUNCH_IDS;
const following = (viewer: number, target: number) => `/api/bunches/${viewer}/following/${target}`;

describe('다른 번치 홈(EXTERNAL)', () => {
  it('지금 번치 명의의 팔로우 상태와 열람 범위를 준다(비공개는 승인 전 번들 403)', async () => {
    const home = await call<Home>('GET', `/api/bunches/${PRIVATE_ID}/home`);
    expect(home.json.data).toMatchObject({
      accessScope: 'EXTERNAL',
      followState: 'NONE',
      followId: null,
      canViewBundles: false,
      myMembership: null,
      isCurrentBunch: false,
    });
    expect((await call('GET', `/api/bunches/${PRIVATE_ID}/published-bundles`)).status).toBe(403);
    expect((await call('GET', `/api/bunches/${PUBLIC_ID}/published-bundles`)).status).toBe(200);
  });

  it('내 번치는 INTERNAL이고 지금 번치인지 알려 준다', async () => {
    const current = await call<Home>('GET', `/api/bunches/${MOCK_BUNCH_ID}/home`);
    const other = await call<Home>('GET', `/api/bunches/${MOCK_SECOND_BUNCH_ID}/home`);
    expect(current.json.data).toMatchObject({ accessScope: 'INTERNAL', isCurrentBunch: true });
    expect(other.json.data).toMatchObject({ accessScope: 'INTERNAL', isCurrentBunch: false });
  });
});

describe('팔로우 PUT·DELETE', () => {
  it('공개 번치는 팔로잉, 다시 보내면 같은 관계를 돌려주고 팔로워 수가 한 번만 늘어난다', async () => {
    const first = await call<Follow>('PUT', following(MOCK_BUNCH_ID, PUBLIC_ID));
    const again = await call<Follow>('PUT', following(MOCK_BUNCH_ID, PUBLIC_ID));

    expect(first.json.data.followState).toBe('FOLLOWING');
    expect(again.json.data).toEqual(first.json.data);
    const home = await call<Home>('GET', `/api/bunches/${PUBLIC_ID}/home`);
    expect(home.json.data).toMatchObject({ followState: 'FOLLOWING', followerCount: 24 });
  });

  it('비공개 번치는 요청 상태이고 승인 전이라 번들은 계속 막힌다', async () => {
    const result = await call<Follow>('PUT', following(MOCK_BUNCH_ID, PRIVATE_ID));

    expect(result.json.data.followState).toBe('REQUESTED');
    expect((await call('GET', `/api/bunches/${PRIVATE_ID}/published-bundles`)).status).toBe(403);
  });

  it('내 번치가 아닌 명의는 AUTH_002, 자기 번치 팔로우는 COMMON_001', async () => {
    expect((await call<Follow>('PUT', following(PRIVATE_ID, PUBLIC_ID))).json.error?.code).toBe(
      'AUTH_002',
    );
    expect(
      (await call<Follow>('PUT', following(MOCK_BUNCH_ID, MOCK_BUNCH_ID))).json.error?.code,
    ).toBe('COMMON_001');
  });

  it('취소는 그 관계의 ID여야 하고, 다른 ID는 404·없는 ID는 400이다', async () => {
    const { followId } = (await call<Follow>('PUT', following(MOCK_BUNCH_ID, PUBLIC_ID))).json.data;
    const path = following(MOCK_BUNCH_ID, PUBLIC_ID);

    expect((await call('DELETE', `${path}?followId=${followId + 1}`)).status).toBe(404);
    expect((await call('DELETE', path)).status).toBe(400);
    const cancelled = await call<{ cancelled: string }>('DELETE', `${path}?followId=${followId}`);
    expect(cancelled.json.data.cancelled).toBe('FOLLOWING');
    expect(myExternalFollows()).toEqual([]);
  });
});
