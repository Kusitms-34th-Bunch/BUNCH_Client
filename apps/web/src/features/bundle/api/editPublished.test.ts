import { describe, expect, it } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_MY_MEMBER_ID, MOCK_PHOTO_IDS } from '@/mocks/db/seed';
// 가짜 서버 응답에 기대므로 직접 연결(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import '@/mocks/server';
import { createIdempotencyKey } from '@/shared/api/client/idempotencyKey';
import { editPublishedBundle } from './bundleEdit';
import { createBundle, getBundle } from './bundles';

const bunchId = String(MOCK_BUNCH_ID);
// 시작 데이터의 발행 번들(번치 홈의 완성된 번들 C1)
const PUBLISHED_ID = '1';
const { S1, S2, S3 } = MOCK_PHOTO_IDS;

const becomeOwner = () =>
  mockDb.update((state) => ({
    ...state,
    memberships: state.memberships.map((membership) =>
      membership.memberId === MOCK_MY_MEMBER_ID && membership.bunchId === MOCK_BUNCH_ID
        ? { ...membership, role: 'OWNER' }
        : membership,
    ),
  }));

const catchError = async (promise: Promise<unknown>, label = '') => {
  try {
    await promise;
  } catch (error) {
    return error as { code?: string; status?: number; data?: unknown };
  }
  throw new Error(`오류가 나야 함 ${label}`);
};

const place = (key: string) => ({
  provider: 'kakao',
  externalId: key,
  name: `장소 ${key}`,
  address: null,
});

const load = async () => {
  const detail = await getBundle(bunchId, PUBLISHED_ID);
  return { detail, firstPhotoId: detail.photos[0]!.id };
};

describe('발행 번들 수정 API', () => {
  it('메인 관리자가 최종 제목·날짜·사진 순서·위치를 한 번에 저장하면 화면 모양으로 돌려받는다', async () => {
    becomeOwner();
    const { detail, firstPhotoId } = await load();

    const saved = await editPublishedBundle(bunchId, PUBLISHED_ID, {
      expectedRevision: detail.revision,
      title: '  고친 제목  ',
      date: '2026-10-18',
      // 사진함에서 가져온 두 장을 앞에 두고 기존 사진은 맨 뒤로 옮김
      photos: [{ photoId: String(S1) }, { photoId: String(S2) }, { bundlePhotoId: firstPhotoId }],
      locations: [place('a'), place('b')],
    });

    expect(saved).toMatchObject({
      status: 'PUBLISHED',
      title: '고친 제목',
      date: '2026-10-18',
      revision: detail.revision + 1,
    });
    expect(saved.photos.map((photo) => photo.sourcePhotoId)).toEqual([
      String(S1),
      String(S2),
      detail.photos[0]?.sourcePhotoId,
    ]);
    expect(saved.photos.at(-1)?.id).toBe(firstPhotoId);
    expect(saved.locations.map((location) => location.name)).toEqual(['장소 a', '장소 b']);
    // 공개 범위·코멘트·참여 멤버는 그대로
    expect(saved.visibility).toBe(detail.visibility);
    expect(saved.comments).toEqual(detail.comments);
    expect(saved.participantIds).toEqual(detail.participantIds);
  });

  it('사진을 빼고 위치와 날짜를 지우면 그대로 반영한다', async () => {
    becomeOwner();
    const first = await load();
    const withTwo = await editPublishedBundle(bunchId, PUBLISHED_ID, {
      expectedRevision: first.detail.revision,
      title: first.detail.title,
      date: '2026-10-18',
      photos: [{ bundlePhotoId: first.firstPhotoId }, { photoId: String(S3) }],
      locations: [place('a')],
    });

    const saved = await editPublishedBundle(bunchId, PUBLISHED_ID, {
      expectedRevision: withTwo.revision,
      title: withTwo.title,
      date: null,
      photos: [{ bundlePhotoId: withTwo.photos[1]!.id }],
      locations: [],
    });

    expect(saved.photos).toHaveLength(1);
    expect(saved.photos[0]?.sourcePhotoId).toBe(String(S3));
    expect(saved.locations).toEqual([]);
    expect(saved.date).toBeNull();
  });

  it('같은 장소는 줄 id를 지키고 새 장소만 새 줄이 된다', async () => {
    becomeOwner();
    const { detail, firstPhotoId } = await load();
    const input = (locations: ReturnType<typeof place>[], revision: number) => ({
      expectedRevision: revision,
      title: detail.title,
      date: detail.date,
      photos: [{ bundlePhotoId: firstPhotoId }],
      locations,
    });
    const one = await editPublishedBundle(
      bunchId,
      PUBLISHED_ID,
      input([place('a')], detail.revision),
    );

    const two = await editPublishedBundle(
      bunchId,
      PUBLISHED_ID,
      input([place('b'), place('a')], one.revision),
    );

    expect(two.locations.map((location) => location.name)).toEqual(['장소 b', '장소 a']);
    const keptId = one.locations[0]?.id;
    expect(two.locations.find((location) => location.name === '장소 a')?.id).toBe(keptId);
  });

  it('낡은 revision은 BUNDLE_003이고 detail에 현재 revision을 준다', async () => {
    becomeOwner();
    const { detail, firstPhotoId } = await load();

    const error = await catchError(
      editPublishedBundle(bunchId, PUBLISHED_ID, {
        expectedRevision: detail.revision - 1,
        title: detail.title,
        date: detail.date,
        photos: [{ bundlePhotoId: firstPhotoId }],
        locations: [],
      }),
    );

    expect(error.code).toBe('BUNDLE_003');
    expect(
      (error.data as { error?: { detail?: { revision?: number } } }).error?.detail?.revision,
    ).toBe(detail.revision);
  });

  it('메인 관리자가 아니면 AUTH_002로 거절한다', async () => {
    // 기본 시작 데이터의 나는 일반 멤버
    const { detail, firstPhotoId } = await load();

    const error = await catchError(
      editPublishedBundle(bunchId, PUBLISHED_ID, {
        expectedRevision: detail.revision,
        title: '몰래 바꿈',
        date: detail.date,
        photos: [{ bundlePhotoId: firstPhotoId }],
        locations: [],
      }),
    );

    expect(error.code).toBe('AUTH_002');
    expect((await getBundle(bunchId, PUBLISHED_ID)).title).toBe(detail.title);
  });

  it('발행 전 초안은 BUNDLE_002이다', async () => {
    becomeOwner();
    const draft = await createBundle(bunchId, [String(S1)], createIdempotencyKey(), ['2']);

    const error = await catchError(
      editPublishedBundle(bunchId, draft.id, {
        expectedRevision: draft.revision,
        title: '제목',
        date: null,
        photos: [{ bundlePhotoId: draft.photos[0]!.id }],
        locations: [],
      }),
    );

    expect(error.code).toBe('BUNDLE_002');
  });

  it('잘못된 입력(빈 제목·40자 초과·사진 0장·번들에 없는 사진·중복 원본·위치 4개)은 COMMON_001이다', async () => {
    becomeOwner();
    const { detail, firstPhotoId } = await load();
    const base = {
      expectedRevision: detail.revision,
      title: detail.title,
      date: detail.date,
      photos: [{ bundlePhotoId: firstPhotoId }],
      locations: [],
    };

    const cases = [
      { ...base, title: '   ' },
      { ...base, title: '가'.repeat(41) },
      { ...base, photos: [] },
      { ...base, photos: [{ bundlePhotoId: '999999' }] },
      // 같은 사진함 원본을 두 번 넣을 수 없음
      {
        ...base,
        photos: [{ bundlePhotoId: firstPhotoId }, { photoId: String(S1) }, { photoId: String(S1) }],
      },
      { ...base, locations: [place('a'), place('b'), place('c'), place('d')] },
    ];
    for (const [index, input] of cases.entries()) {
      const error = await catchError(
        editPublishedBundle(bunchId, PUBLISHED_ID, input),
        `(케이스 ${index})`,
      );
      expect(error.code).toBe('COMMON_001');
    }
  });

  it('서버 숫자가 아닌 사진 id는 요청 없이 막는다', async () => {
    becomeOwner();
    const { detail } = await load();

    const error = await catchError(
      editPublishedBundle(bunchId, PUBLISHED_ID, {
        expectedRevision: detail.revision,
        title: detail.title,
        date: detail.date,
        photos: [{ photoId: 'temp-1' }],
        locations: [],
      }),
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBeUndefined();
  });

  it('사진 항목이 객체가 아니면(null) COMMON_001로 거절한다', async () => {
    becomeOwner();
    const { detail } = await load();

    const response = await fetch(
      `http://localhost:3000/api/bunches/${bunchId}/bundles/${PUBLISHED_ID}/published`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          expectedRevision: detail.revision,
          title: '제목',
          photos: [null],
          locations: [],
        }),
      },
    );

    expect(response.status).toBe(400);
  });

  it('위치를 지우면 그 번들에서 콕한 장소만 콕한 장소에서도 지운다', async () => {
    becomeOwner();
    const { detail, firstPhotoId } = await load();
    const withPlaces = await editPublishedBundle(bunchId, PUBLISHED_ID, {
      expectedRevision: detail.revision,
      title: detail.title,
      date: detail.date,
      photos: [{ bundlePhotoId: firstPhotoId }],
      locations: [place('a'), place('b')],
    });
    const kok = (id: number, key: string, sourceBundleId: number) => ({
      id,
      bunchId: MOCK_BUNCH_ID,
      provider: 'kakao',
      externalId: key,
      name: `장소 ${key}`,
      address: '',
      sourceBundleId,
      sourceLocationId: null,
      sourceAdvertisementId: null,
      pinnedByMemberId: MOCK_MY_MEMBER_ID,
      pinnedAt: '2026-10-01T00:00:00+09:00',
    });
    mockDb.update((state) => ({
      ...state,
      koks: [
        ...state.koks,
        kok(98001, 'a', Number(PUBLISHED_ID)),
        kok(98002, 'b', Number(PUBLISHED_ID)),
        // 같은 장소라도 다른 번들에서 콕한 것은 그대로
        kok(98003, 'b', Number(PUBLISHED_ID) + 100),
      ],
    }));

    await editPublishedBundle(bunchId, PUBLISHED_ID, {
      expectedRevision: withPlaces.revision,
      title: withPlaces.title,
      date: withPlaces.date,
      photos: [{ bundlePhotoId: firstPhotoId }],
      locations: [place('a')],
    });

    const ids = mockDb.get().koks.map((item) => item.id);
    expect(ids).toContain(98001);
    expect(ids).not.toContain(98002);
    expect(ids).toContain(98003);
  });
});
