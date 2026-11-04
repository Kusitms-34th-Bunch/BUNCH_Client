import { describe, expect, it } from 'vitest';
import { mockDb } from '../db';
import { MOCK_BUNCH_ID, MOCK_MEMBER_IDS } from '../db/seed';

const base = `/api/bunches/${MOCK_BUNCH_ID}`;

type Page = { items: { id: number; title: string }[]; page: number; size: number; total: number };
type Home = {
  bunch: { id: number; name: string; visibility: string; introduction: string };
  myMembership: { role: string };
  permissions: Record<string, boolean>;
  memberCount: number;
  draftCount: number;
  publishedCount: number;
  stage: number;
};
type Envelope<T> = { success: boolean; data: T; error: { code: string } | null };

const get = async <T>(path: string) => {
  const response = await fetch(path);
  return { status: response.status, json: (await response.json()) as Envelope<T> };
};

// 시작 데이터의 기존 발행 번들 2개(C1은 9월 21일, C2는 8월 30일 발행)에 새 발행본·초안을 더한 상태
const addBundle = (id: number, status: 'DRAFT' | 'PUBLISHED', at: string) => {
  const template = mockDb.get().bundles[0]!;
  mockDb.update((current) => ({
    ...current,
    bundles: [
      ...current.bundles,
      {
        ...template,
        id,
        status,
        title: `${status} ${id}`,
        publishedAt: status === 'PUBLISHED' ? at : null,
        updatedAt: at,
      },
    ],
  }));
};

describe('가짜 서버 번치 홈 번들 목록', () => {
  it('발행본은 발행 최신순으로 돌려주고 새로 발행한 번들이 맨 앞에 온다', async () => {
    addBundle(3, 'PUBLISHED', '2026-11-04T01:00:00.000Z');

    const { json } = await get<Page>(`${base}/bundles?status=PUBLISHED`);

    expect(json.data.items.map((item) => item.id)).toEqual([3, 1, 2]);
    expect(json.data).toMatchObject({ page: 0, size: 20, total: 3 });
    expect(json.data.items[1]?.title).toBe('강릉 커피 투어 ☕');
  });

  it('초안 목록은 수정 최신순이고 발행본과 섞이지 않는다', async () => {
    addBundle(3, 'DRAFT', '2026-11-04T01:00:00.000Z');
    addBundle(4, 'DRAFT', '2026-11-04T02:00:00.000Z');

    const { json } = await get<Page>(`${base}/bundles?status=DRAFT`);

    expect(json.data.items.map((item) => item.id)).toEqual([4, 3]);
    expect(json.data.total).toBe(2);
  });

  it('페이지 크기만큼 잘라 돌려주고 전체 개수는 그대로다', async () => {
    const { json } = await get<Page>(`${base}/bundles?status=PUBLISHED&page=1&size=1`);

    expect(json.data).toMatchObject({ page: 1, size: 1, total: 2 });
    expect(json.data.items.map((item) => item.id)).toEqual([2]);
  });

  it.each([
    ['status 없음', ''],
    ['알 수 없는 status', '?status=ALL'],
    ['page 음수', '?status=PUBLISHED&page=-1'],
    ['size 0', '?status=PUBLISHED&size=0'],
    ['size 51', '?status=PUBLISHED&size=51'],
  ])('%s는 COMMON_001(400)이다', async (_name, query) => {
    const { status, json } = await get<Page>(`${base}/bundles${query}`);

    expect(status).toBe(400);
    expect(json.error?.code).toBe('COMMON_001');
  });

  it('없는 번치는 RESOURCE_001, 소속이 아니면 AUTH_002이다', async () => {
    expect((await get<Page>('/api/bunches/999/bundles?status=PUBLISHED')).json.error?.code).toBe(
      'RESOURCE_001',
    );
    mockDb.update((current) => ({ ...current, memberships: [] }));
    expect((await get<Page>(`${base}/bundles?status=PUBLISHED`)).json.error?.code).toBe('AUTH_002');
  });
});

describe('가짜 서버 번들 현황과 번치 홈', () => {
  it('번들 현황은 번들 상세 경로와 섞이지 않고 초안·발행 개수와 Stage를 돌려준다', async () => {
    addBundle(3, 'DRAFT', '2026-11-04T01:00:00.000Z');

    const { status, json } = await get<{
      draftCount: number;
      publishedCount: number;
      stage: number;
    }>(`${base}/bundles/summary`);

    expect(status).toBe(200);
    expect(json.data).toEqual({ draftCount: 1, publishedCount: 2, stage: 1 });
  });

  it('발행본이 4개가 되면 Stage가 오른다(현재 dev 기준 4~7개=2)', async () => {
    addBundle(3, 'PUBLISHED', '2026-11-04T01:00:00.000Z');
    addBundle(4, 'PUBLISHED', '2026-11-04T02:00:00.000Z');

    const { json } = await get<{ stage: number; publishedCount: number }>(
      `${base}/bundles/summary`,
    );

    expect(json.data).toMatchObject({ publishedCount: 4, stage: 2 });
  });

  it('번치 홈은 프로필·내 역할·권한·개수를 한 번에 돌려준다', async () => {
    const { json } = await get<Home>(`${base}/home`);

    expect(json.data).toMatchObject({
      bunch: { id: MOCK_BUNCH_ID, name: '여행쥬아', visibility: 'PRIVATE' },
      myMembership: { role: 'MEMBER' },
      permissions: { canEditProfile: false, canInvite: false, canLeave: true },
      memberCount: 5,
      draftCount: 0,
      publishedCount: 2,
      stage: 1,
    });
    expect(json.data.bunch.introduction).toBe('여행 안 갈 바엔 죽을란다');
  });

  it('관리자 역할이면 권한 값이 달라진다', async () => {
    mockDb.update((current) => ({
      ...current,
      memberships: current.memberships.map((membership) =>
        membership.memberId === MOCK_MEMBER_IDS.me ? { ...membership, role: 'OWNER' } : membership,
      ),
    }));

    const { json } = await get<Home>(`${base}/home`);

    expect(json.data.permissions).toMatchObject({ canEditProfile: true, canInvite: true });
  });

  it('없는 번치는 RESOURCE_001이다', async () => {
    expect((await get<unknown>('/api/bunches/999/home')).json.error?.code).toBe('RESOURCE_001');
  });
});

type PublishedPage = {
  items: {
    id: number;
    title: string;
    coverImageUrl: string | null;
    date: string | null;
    location: null;
    publishedAt: string | null;
  }[];
  page: number;
  size: number;
  totalElements: number;
  hasNext: boolean;
};

describe('가짜 서버 번치 발행 번들 목록', () => {
  it('발행본만 발행 최신순으로, 표지·날짜·발행 시각과 함께 돌려준다', async () => {
    addBundle(3, 'PUBLISHED', '2026-11-04T01:00:00.000Z');
    addBundle(4, 'DRAFT', '2026-11-04T02:00:00.000Z');

    const { json } = await get<PublishedPage>(`${base}/published-bundles`);

    expect(json.data.items.map((item) => item.id)).toEqual([3, 1, 2]);
    expect(json.data).toMatchObject({ page: 0, size: 20, totalElements: 3, hasNext: false });
    expect(json.data.items[1]).toMatchObject({
      title: '강릉 커피 투어 ☕',
      coverImageUrl: '/mock/photos/C1.jpg',
      date: '2026-09-20',
      location: null,
      publishedAt: '2026-09-21T09:00:00.000Z',
    });
  });

  it('다음 쪽이 있으면 hasNext가 true다', async () => {
    const { json } = await get<PublishedPage>(`${base}/published-bundles?size=1`);

    expect(json.data).toMatchObject({ size: 1, totalElements: 2, hasNext: true });
    expect(json.data.items).toHaveLength(1);
  });

  it.each(['?size=0', '?size=51', '?page=-1'])('%s는 COMMON_001(400)이다', async (query) => {
    const { status, json } = await get<PublishedPage>(`${base}/published-bundles${query}`);

    expect(status).toBe(400);
    expect(json.error?.code).toBe('COMMON_001');
  });

  it('없는 번치는 RESOURCE_001, 소속이 아니면 AUTH_002이다', async () => {
    expect((await get<PublishedPage>('/api/bunches/999/published-bundles')).json.error?.code).toBe(
      'RESOURCE_001',
    );
    mockDb.update((current) => ({ ...current, memberships: [] }));
    expect((await get<PublishedPage>(`${base}/published-bundles`)).json.error?.code).toBe(
      'AUTH_002',
    );
  });
});
