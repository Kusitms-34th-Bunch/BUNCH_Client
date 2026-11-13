import { describe, expect, it } from 'vitest';
// 가짜 서버 응답에 기대므로 직접 연결(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import '../server';
import { mockDb } from '../db';
import { MOCK_BUNCH_ID, MOCK_EXTERNAL_BUNCH_IDS, MOCK_MY_MEMBER_ID } from '../db/seed';

type Envelope<T> = { success: boolean; data: T; error: { code: string } | null };
const call = async <T>(method: string, path: string, body?: unknown) => {
  const response = await fetch(path, {
    method,
    ...(body === undefined
      ? {}
      : { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }),
  });
  return { status: response.status, json: (await response.json()) as Envelope<T> };
};
type BlockPage = { items: { id: number; bunch: { id: number; name: string } }[] };

const { public: PUBLIC_ID } = MOCK_EXTERNAL_BUNCH_IDS;
const blockPath = (target: number) => `/api/bunches/${MOCK_BUNCH_ID}/blocks/${target}`;
const asAdmin = () =>
  mockDb.update((state) => ({
    ...state,
    memberships: state.memberships.map((item) =>
      item.memberId === MOCK_MY_MEMBER_ID && item.bunchId === MOCK_BUNCH_ID
        ? { ...item, role: 'CO_OWNER' as const }
        : item,
    ),
  }));

describe('차단 목록·차단', () => {
  it('목록은 최근 차단순이고, 차단하면 맨 위에 더하며 두 번치 사이 팔로우를 지운다', async () => {
    const before = await call<BlockPage>('GET', `/api/bunches/${MOCK_BUNCH_ID}/blocks`);
    expect(before.json.data.items.map((item) => item.bunch.name)).toEqual([
      '야간러너스',
      '주말산책',
    ]);
    // 시작 데이터: 캠핑러버(3)가 여행쥬아를 팔로우
    expect(
      mockDb
        .get()
        .follows.some((f) => f.followerBunchId === PUBLIC_ID && f.targetBunchId === MOCK_BUNCH_ID),
    ).toBe(true);

    expect((await call('PUT', blockPath(PUBLIC_ID))).status).toBe(200);
    // 이미 차단했으면 그대로
    expect((await call('PUT', blockPath(PUBLIC_ID))).status).toBe(200);

    const after = await call<BlockPage>('GET', `/api/bunches/${MOCK_BUNCH_ID}/blocks`);
    expect(after.json.data.items[0]?.bunch.id).toBe(PUBLIC_ID);
    expect(after.json.data.items).toHaveLength(3);
    expect(
      mockDb
        .get()
        .follows.some(
          (f) =>
            (f.followerBunchId === PUBLIC_ID && f.targetBunchId === MOCK_BUNCH_ID) ||
            (f.followerBunchId === MOCK_BUNCH_ID && f.targetBunchId === PUBLIC_ID),
        ),
    ).toBe(false);
  });

  it('차단 관계면 그 번치의 홈·관계 목록이 403이다', async () => {
    await call('PUT', blockPath(PUBLIC_ID));
    expect((await call('GET', `/api/bunches/${PUBLIC_ID}/home`)).status).toBe(403);
    expect((await call('GET', `/api/bunches/${PUBLIC_ID}/followers`)).status).toBe(403);
  });

  it('내 소속 번치가 아니거나 자기 자신이면 막는다', async () => {
    expect((await call('PUT', `/api/bunches/${PUBLIC_ID}/blocks/${MOCK_BUNCH_ID}`)).status).toBe(
      403,
    );
    expect((await call('PUT', blockPath(MOCK_BUNCH_ID))).status).toBe(400);
  });
});

describe('차단 해제', () => {
  it('일반 멤버는 403, 관리자는 그 차단의 ID로만 해제한다(다른 ID는 404)', async () => {
    const page = await call<BlockPage>('GET', `/api/bunches/${MOCK_BUNCH_ID}/blocks`);
    const target = page.json.data.items[0];
    if (!target) throw new Error('시작 데이터에 차단이 없음');
    const path = `${blockPath(target.bunch.id)}?blockId=${target.id}`;

    expect((await call('DELETE', path)).status).toBe(403);
    asAdmin();
    expect((await call('DELETE', `${blockPath(target.bunch.id)}?blockId=999`)).status).toBe(404);
    expect((await call('DELETE', blockPath(target.bunch.id))).status).toBe(400);
    expect((await call('DELETE', path)).status).toBe(200);
    expect(mockDb.get().blocks.some((block) => block.id === target.id)).toBe(false);
  });
});

describe('신고', () => {
  it('정해진 사유만 받고, 상세 사유는 비어 있으면 저장하지 않는다', async () => {
    const reports = `/api/bunches/${MOCK_BUNCH_ID}/reports`;
    expect((await call('POST', reports, { targetBunchId: PUBLIC_ID, reason: 'NOPE' })).status).toBe(
      400,
    );
    expect(
      (await call('POST', reports, { targetBunchId: MOCK_BUNCH_ID, reason: 'SPAM' })).status,
    ).toBe(400);

    const result = await call<{ reportId: number }>('POST', reports, {
      targetBunchId: PUBLIC_ID,
      reason: 'SPAM',
      detail: '  ',
    });
    expect(result.json.data.reportId).toBe(1);
    expect(mockDb.get().reports).toEqual([
      {
        id: 1,
        reporterBunchId: MOCK_BUNCH_ID,
        targetBunchId: PUBLIC_ID,
        reason: 'SPAM',
        detail: null,
      },
    ]);
  });
});
