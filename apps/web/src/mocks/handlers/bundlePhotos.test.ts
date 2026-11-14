import { describe, expect, it } from 'vitest';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
// 가짜 서버 응답에 기대므로 직접 연결(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import '../server';
import { mockDb } from '../db';
import { MOCK_BUNCH_ID, MOCK_PHOTO_IDS, MOCK_MEMBER_IDS } from '../db/seed';

const base = `/api/bunches/${MOCK_BUNCH_ID}/bundles`;
const { S1, S4, S5, P1, P3 } = MOCK_PHOTO_IDS;

type Snapshot = {
  id: number;
  status: string;
  revision: number;
  photos: { id: number; photoId: number; position: number }[];
  photoChangeResult?: { addedPhotoIds: number[]; rejectedPhotoIds: number[]; replayed: boolean };
};
type Envelope = { success: boolean; data: Snapshot; error: { code: string } | null };

const call = async (method: string, path: string, body?: unknown, headers = {}) => {
  const response = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, json: (await response.json()) as Envelope };
};

const create = async (photoIds: number[]) =>
  (
    await call(
      'POST',
      base,
      { photoIds, participantMemberIds: [MOCK_MEMBER_IDS.memberA] },
      { 'Idempotency-Key': createIdempotencyKey() },
    )
  ).json.data;

const change = (
  bundleId: number,
  body: {
    addPhotoIds?: number[];
    removeBundlePhotoIds?: number[];
    mode?: string;
    capacityMode?: string;
    reselectedPhotoIds?: number[];
  },
  key = createIdempotencyKey(),
) =>
  call(
    'POST',
    `${base}/${bundleId}/photos/changes`,
    { mode: 'DRAFT', ...body },
    { 'Idempotency-Key': key },
  );

const move = (
  bundleId: number,
  photoId: number,
  previous: number | null,
  next: number | null,
  requestId?: string,
) =>
  call(
    'POST',
    `${base}/${bundleId}/photos/${photoId}/move`,
    { previousBundlePhotoId: previous, nextBundlePhotoId: next, mode: 'DRAFT' },
    requestId ? { 'X-Request-Id': requestId } : {},
  );

const order = (draft: Snapshot) => draft.photos.map((photo) => photo.photoId);

describe('가짜 서버 번들 사진 구성 변경', () => {
  it('사진을 추가하면 맨 뒤에 붙고 revision이 오른다', async () => {
    const draft = await create([S4, S5]);

    const { status, json } = await change(draft.id, { addPhotoIds: [S1] });

    expect(status).toBe(200);
    expect(order(json.data)).toEqual([S4, S5, S1]);
    expect(json.data.photos.map((photo) => photo.position)).toEqual([0, 1, 2]);
    expect(json.data.revision).toBe(draft.revision + 1);
  });

  it('사진을 제거하면 남은 순서를 지키고, 마지막 한 장은 제거할 수 없다', async () => {
    const draft = await create([S4, S5]);
    const [first, second] = draft.photos;

    const removed = await change(draft.id, { removeBundlePhotoIds: [first!.id] });
    expect(order(removed.json.data)).toEqual([S5]);
    expect(removed.json.data.photos[0]?.position).toBe(0);

    const last = await change(draft.id, { removeBundlePhotoIds: [second!.id] });
    expect(last.status).toBe(409);
    expect(last.json.error?.code).toBe('BUNDLE_006');
  });

  it('구성이 그대로면 revision을 올리지 않는다', async () => {
    const draft = await create([S4, S5]);

    const { json } = await change(draft.id, {});

    expect(json.data.revision).toBe(draft.revision);
  });

  it('같은 키·같은 본문은 처음 결과를 재생하고, 같은 키에 다른 본문은 REQUEST_001이다', async () => {
    const draft = await create([S4, S5]);
    const key = createIdempotencyKey();

    const first = await change(draft.id, { addPhotoIds: [S1] }, key);
    const replay = await change(draft.id, { addPhotoIds: [S1] }, key);
    const other = await change(draft.id, { addPhotoIds: [P1] }, key);

    expect(replay.json.data.revision).toBe(first.json.data.revision);
    expect(replay.json.data.photos).toHaveLength(3);
    expect(other.status).toBe(409);
    expect(other.json.error?.code).toBe('REQUEST_001');
  });

  it('입력이 잘못되면 거절한다: 키 없음, 중복 ID, 같은 원본의 추가와 제거, 모드 불일치', async () => {
    const draft = await create([S4, S5]);
    const [first] = draft.photos;

    const noKey = await call('POST', `${base}/${draft.id}/photos/changes`, {
      addPhotoIds: [S1],
      mode: 'DRAFT',
    });
    expect(noKey.status).toBe(400);
    expect((await change(draft.id, { addPhotoIds: [S1, S1] })).status).toBe(400);
    expect(
      (await change(draft.id, { addPhotoIds: [S4], removeBundlePhotoIds: [first!.id] })).status,
    ).toBe(400);
    const mode = await change(draft.id, { addPhotoIds: [S1], mode: 'PUBLISHED' });
    expect(mode.status).toBe(409);
    expect(mode.json.error?.code).toBe('BUNDLE_002');
  });

  it('이미 담긴 원본은 다시 추가할 수 없고, 없는 원본은 400, 다른 번들 사진은 404다', async () => {
    const draft = await create([S4, S5]);
    const other = await create([S1, P1]);

    const duplicated = await change(draft.id, { addPhotoIds: [S4] });
    expect(duplicated.status).toBe(409);
    expect(duplicated.json.error?.code).toBe('BUNDLE_006');
    expect((await change(draft.id, { addPhotoIds: [99999] })).status).toBe(400);
    expect((await change(draft.id, { removeBundlePhotoIds: [other.photos[0]!.id] })).status).toBe(
      404,
    );
  });

  it('이미 제거된(어느 번들에도 없는) 번들 사진 ID는 건너뛴다', async () => {
    const draft = await create([S4, S5]);

    const { status, json } = await change(draft.id, { removeBundlePhotoIds: [999999] });

    expect(status).toBe(200);
    expect(json.data.revision).toBe(draft.revision);
  });

  it('최종 사진은 20장까지 담을 수 있다', async () => {
    const all = Object.values(MOCK_PHOTO_IDS);
    const draft = await create(all.slice(0, 13));

    const { status, json } = await change(draft.id, { addPhotoIds: all.slice(13) });

    expect(status).toBe(200);
    expect(json.data.photos).toHaveLength(all.length);
  });
});

describe('가짜 서버 번들 사진 순서 이동', () => {
  it('앞뒤 anchor 사이로 옮기고 revision이 오른다', async () => {
    const draft = await create([P1, P3, S4]);
    const [a, b, c] = draft.photos;

    const toFront = await move(draft.id, c!.id, null, a!.id);
    expect(order(toFront.json.data)).toEqual([S4, P1, P3]);
    expect(toFront.json.data.revision).toBe(draft.revision + 1);

    const toMiddle = await move(draft.id, c!.id, a!.id, b!.id);
    expect(order(toMiddle.json.data)).toEqual([P1, S4, P3]);

    const toEnd = await move(draft.id, c!.id, b!.id, null);
    expect(order(toEnd.json.data)).toEqual([P1, P3, S4]);
  });

  it('서로 인접하지 않은 앞뒤 anchor도 받아들여 뒤 anchor 직전에 두고, 뒤 anchor가 없으면 앞 anchor 직후에 둔다', async () => {
    const draft = await create([P1, P3, S4, S5]);
    const [a, b, c, d] = draft.photos;

    const apart = await move(draft.id, d!.id, a!.id, c!.id);
    expect(apart.status).toBe(200);
    expect(order(apart.json.data)).toEqual([P1, P3, S5, S4]);

    const afterPrevious = await move(draft.id, a!.id, b!.id, null);
    expect(order(afterPrevious.json.data)).toEqual([P3, P1, S5, S4]);
  });

  it('자기 자신이나 같은 사진을 anchor로 쓰거나 없는 anchor이거나 양쪽 null이면 BUNDLE_006이다', async () => {
    const draft = await create([P1, P3, S4, S5]);
    const [a, b, , d] = draft.photos;

    for (const [previous, next] of [
      [d!.id, null],
      [null, d!.id],
      [a!.id, a!.id],
      [999999, null],
      [null, 999999],
      [null, null],
    ] as const) {
      const result = await move(draft.id, d!.id, previous, next);
      expect(result.status).toBe(409);
      expect(result.json.error?.code).toBe('BUNDLE_006');
    }
    expect(b).toBeDefined();
  });

  it('자리가 그대로면 revision을 올리지 않고, 없는 사진은 404다', async () => {
    const draft = await create([P1, P3, S4]);
    const [, b, c] = draft.photos;

    const same = await move(draft.id, c!.id, b!.id, null);
    expect(same.json.data.revision).toBe(draft.revision);
    expect((await move(draft.id, 999999, null, null)).status).toBe(404);
  });
});

describe('가짜 서버 번들 사진 구성 변경의 정원·재선택', () => {
  // 사진 19장이 담긴 초안(정원 20장에 1자리가 남음)과 아직 담기지 않은 원본 2장(시작 데이터가 13장뿐이라 원본을 더 만듦)
  const nearlyFull = async () => {
    const sample = mockDb.get().photos.find((photo) => photo.bunchId === MOCK_BUNCH_ID)!;
    const extra = Array.from({ length: 8 }, (_, index) => 91001 + index);
    mockDb.update((current) => ({
      ...current,
      photos: [...current.photos, ...extra.map((photoId) => ({ ...sample, photoId }))],
    }));
    const inBundle = [...Object.values(MOCK_PHOTO_IDS), ...extra.slice(0, 6)];
    return { draft: await create(inBundle), rest: extra.slice(6) };
  };

  it('응답에 사진 구성 변경 결과가 담기고 같은 키 재시도는 빈 결과(replayed)다', async () => {
    const draft = await create([S4, S5]);
    const key = createIdempotencyKey();

    const first = await change(draft.id, { addPhotoIds: [S1] }, key);
    const replay = await change(draft.id, { addPhotoIds: [S1] }, key);

    expect(first.json.data.photoChangeResult).toEqual({
      addedPhotoIds: [S1],
      rejectedPhotoIds: [],
      replayed: false,
    });
    expect(replay.json.data.photoChangeResult).toEqual({
      addedPhotoIds: [],
      rejectedPhotoIds: [],
      replayed: true,
    });
    expect(replay.json.data.revision).toBe(first.json.data.revision);
  });

  it('정원을 넘기면 기본(ATOMIC_APPLY)은 전부 거절하고 PARTIAL_ADD는 남은 자리까지만 담는다', async () => {
    const { draft, rest } = await nearlyFull();
    expect(rest.length).toBeGreaterThanOrEqual(2);
    const [one, two] = rest as [number, number];

    const atomic = await change(draft.id, { addPhotoIds: [one, two] });
    expect(atomic.status).toBe(409);
    expect(atomic.json.error?.code).toBe('BUNDLE_006');

    const partial = await change(draft.id, {
      addPhotoIds: [one, two],
      capacityMode: 'PARTIAL_ADD',
    });
    expect(partial.status).toBe(200);
    expect(partial.json.data.photos).toHaveLength(20);
    expect(partial.json.data.photoChangeResult).toEqual({
      addedPhotoIds: [one],
      rejectedPhotoIds: [two],
      replayed: false,
    });
  });

  it('재선택한 사진은 번들 사진 ID를 지키고 뒤로 옮기며, 부분집합이 아니거나 PARTIAL_ADD와는 쓸 수 없다', async () => {
    const draft = await create([S4, S5, S1]);
    const first = draft.photos[0]!;

    const reselected = await change(draft.id, {
      addPhotoIds: [S4],
      reselectedPhotoIds: [S4],
    });
    expect(reselected.status).toBe(200);
    expect(order(reselected.json.data)).toEqual([S5, S1, S4]);
    expect(reselected.json.data.photos.at(-1)?.id).toBe(first.id);

    const notSubset = await change(draft.id, { addPhotoIds: [S1], reselectedPhotoIds: [S5] });
    const withPartial = await change(draft.id, {
      addPhotoIds: [S1],
      reselectedPhotoIds: [S1],
      capacityMode: 'PARTIAL_ADD',
    });
    expect(notSubset.status).toBe(400);
    expect(withPartial.status).toBe(400);
  });
});

describe('가짜 서버 번들 사진 이동의 요청 ID', () => {
  it('같은 X-Request-Id의 같은 이동은 다시 적용하지 않고 다른 내용이면 REQUEST_001이다', async () => {
    const draft = await create([S4, S5, S1]);
    const [a, b, c] = draft.photos.map((photo) => photo) as unknown as [
      { id: number },
      { id: number },
      { id: number },
    ];
    const requestId = createIdempotencyKey();

    const first = await move(draft.id, a.id, c.id, null, requestId);
    expect(order(first.json.data)).toEqual([S5, S1, S4]);

    // 그 사이 다른 이동이 있었어도 같은 요청의 재시도는 옛 이동을 되풀이하지 않음
    await move(draft.id, a.id, null, b.id);
    const replay = await move(draft.id, a.id, c.id, null, requestId);
    expect(replay.status).toBe(200);
    expect(order(replay.json.data)).toEqual([S4, S5, S1]);

    const conflict = await move(draft.id, b.id, null, a.id, requestId);
    expect(conflict.status).toBe(409);
    expect(conflict.json.error?.code).toBe('REQUEST_001');
  });
});
