import { describe, expect, it } from 'vitest';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
// 가짜 서버 응답에 기대므로 직접 연결(PR의 `--changed`가 handler 변경 때 이 테스트를 고르게)
import '../server';
import { mockDb } from '../db';
import { MOCK_BUNCH_ID, MOCK_MEMBER_IDS, MOCK_PHOTO_IDS } from '../db/seed';

const base = `/api/bunches/${MOCK_BUNCH_ID}/bundles`;
const { S1, S4, S5, P1, P2, P3, P4 } = MOCK_PHOTO_IDS;

type Snapshot = {
  id: number;
  status: string;
  revision: number;
  photos: { id: number; photoId: number; position: number; caption: string }[];
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
  (await call('POST', base, { photoIds }, { 'Idempotency-Key': createIdempotencyKey() })).json.data;

const change = (
  bundleId: number,
  body: { addPhotoIds?: number[]; removeBundlePhotoIds?: number[]; mode?: string },
  key = createIdempotencyKey(),
) =>
  call(
    'POST',
    `${base}/${bundleId}/photos/changes`,
    { mode: 'DRAFT', ...body },
    { 'Idempotency-Key': key },
  );

const move = (bundleId: number, photoId: number, previous: number | null, next: number | null) =>
  call('POST', `${base}/${bundleId}/photos/${photoId}/move`, {
    previousBundlePhotoId: previous,
    nextBundlePhotoId: next,
    mode: 'DRAFT',
  });

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

  it('이미 담긴 원본은 다시 추가할 수 없고, 없는 원본·다른 번들 사진은 404다', async () => {
    const draft = await create([S4, S5]);
    const other = await create([S1, P1]);

    const duplicated = await change(draft.id, { addPhotoIds: [S4] });
    expect(duplicated.status).toBe(409);
    expect(duplicated.json.error?.code).toBe('BUNDLE_006');
    expect((await change(draft.id, { addPhotoIds: [99999] })).status).toBe(404);
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

  it('서로 인접하지 않거나 없는 anchor는 BUNDLE_006이다', async () => {
    const draft = await create([P1, P3, S4, S5]);
    const [a, , c, d] = draft.photos;

    const apart = await move(draft.id, d!.id, a!.id, c!.id);
    expect(apart.status).toBe(409);
    expect(apart.json.error?.code).toBe('BUNDLE_006');
    expect((await move(draft.id, d!.id, 999999, null)).json.error?.code).toBe('BUNDLE_006');
    expect((await move(draft.id, d!.id, null, null)).json.error?.code).toBe('BUNDLE_006');
  });

  it('자리가 그대로면 revision을 올리지 않고, 없는 사진은 404다', async () => {
    const draft = await create([P1, P3, S4]);
    const [, b, c] = draft.photos;

    const same = await move(draft.id, c!.id, b!.id, null);
    expect(same.json.data.revision).toBe(draft.revision);
    expect((await move(draft.id, 999999, null, null)).status).toBe(404);
  });
});

describe('다른 멤버가 편집 중인 사진', () => {
  it('편집 중인 사진은 빼거나 옮길 수 없고, 나머지는 바꿀 수 있다', async () => {
    const draft = await create([P1, P2, P3, P4]);
    const second = draft.photos.find((photo) => photo.photoId === P2)!;
    const first = draft.photos.find((photo) => photo.photoId === P1)!;
    const third = draft.photos.find((photo) => photo.photoId === P3)!;
    const fourth = draft.photos.find((photo) => photo.photoId === P4)!;
    mockDb.update((state) => ({
      ...state,
      bundleLeases: [
        ...state.bundleLeases,
        {
          bundleId: draft.id,
          target: `PHOTO:${second.id}`,
          memberId: MOCK_MEMBER_IDS.memberA,
          token: '00000000-0000-4000-8000-00000000000a',
          leaseVersion: 1,
          expiresAt: '2999-01-01T00:00:00.000Z',
        },
      ],
    }));

    const removed = await change(draft.id, { removeBundlePhotoIds: [second.id] });
    expect(removed.status).toBe(409);
    expect(removed.json.error?.code).toBe('BUNDLE_004');
    const moved = await move(draft.id, second.id, third.id, null);
    expect(moved.status).toBe(409);
    expect(moved.json.error?.code).toBe('BUNDLE_004');

    const ok = await move(draft.id, first.id, third.id, fourth.id);
    expect(ok.status).toBe(200);
  });
});
