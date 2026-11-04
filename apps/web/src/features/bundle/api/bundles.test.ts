import { INVALID_RESPONSE_CODE } from '@app/api-core';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_MEMBER_IDS, MOCK_PHOTO_IDS } from '@/mocks/db/seed';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { createIdempotencyKey } from '@/shared/api/idempotencyKey';
import {
  addBundleParticipant,
  createBundle,
  getBundle,
  publishBundle,
  readPublishBlockers,
  readVersionConflict,
  removeBundleParticipant,
  saveBundleCaption,
  saveBundleComment,
  saveBundleDate,
  saveBundleTitle,
  saveBundleVisibility,
} from './bundles';
import { leaseTransport } from './leases';

const bunchId = String(MOCK_BUNCH_ID);
const { memberA, memberB, me } = MOCK_MEMBER_IDS;
const photos = [String(MOCK_PHOTO_IDS.S4), String(MOCK_PHOTO_IDS.S5)];

const catchError = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('rejected promise expected');
};

// 계약 모양 응답을 화면 모양으로 바꾸는지와 요청 본문·헤더를 가짜 서버로 함께 확인
describe('번들 API', () => {
  it('초안을 만들면 화면 모양(문자열 id, 참여자 순서, 권한)으로 돌려준다', async () => {
    const draft = await createBundle(bunchId, photos, createIdempotencyKey());

    expect(draft).toMatchObject({
      status: 'DRAFT',
      createdBy: String(me),
      title: '',
      visibility: null,
      revision: 1,
      participantIds: [String(me), String(memberA)],
      permissions: { creator: true, canPublish: true },
    });
    expect(draft.photos.map((photo) => photo.sourcePhotoId)).toEqual(photos);
    expect(draft.photos[0]?.src).toBe('/mock/photos/S4.jpg');
  });

  it('고른 사진 id를 서버 숫자로 바꿔 순서대로 보내고 멱등 키를 헤더에 싣는다', async () => {
    let body: unknown;
    let key: string | null = null;
    server.use(
      http.post('/api/bunches/:bunchId/bundles', async ({ request }) => {
        body = await request.json();
        key = request.headers.get('Idempotency-Key');
        return fail(500, 'COMMON_500');
      }),
    );
    const idempotencyKey = createIdempotencyKey();

    await catchError(createBundle(bunchId, ['5', '4'], idempotencyKey));

    expect(body).toEqual({ photoIds: [5, 4] });
    expect(key).toBe(idempotencyKey);
  });

  it('서버 숫자로 바꿀 수 없는 사진 id는 요청하지 않고 오류다', async () => {
    const error = await catchError(createBundle(bunchId, ['temp-1'], createIdempotencyKey()));

    expect(error).toMatchObject({ name: 'ApiError', category: 'validation' });
    expect(mockDb.get().bundles).toHaveLength(0);
  });

  it('상세 조회는 같은 번들을 돌려주고 없는 번들은 RESOURCE_001이다', async () => {
    const draft = await createBundle(bunchId, photos, createIdempotencyKey());

    await expect(getBundle(bunchId, draft.id)).resolves.toEqual(draft);
    await expect(getBundle(bunchId, '999')).rejects.toMatchObject({
      status: 404,
      code: 'RESOURCE_001',
    });
  });

  it('제목·공개 범위·날짜·캡션·코멘트 저장이 각 필드 버전과 함께 반영된다', async () => {
    const draft = await createBundle(bunchId, photos, createIdempotencyKey());
    const base = { bunchId, bundleId: draft.id, mode: 'DRAFT' } as const;
    const title = await leaseTransport.acquire(bunchId, draft.id, 'TITLE');
    const date = await leaseTransport.acquire(bunchId, draft.id, 'DATE');
    const firstPhoto = draft.photos[0]!;
    const caption = await leaseTransport.acquire(bunchId, draft.id, `PHOTO:${firstPhoto.id}`);

    await saveBundleTitle({
      ...base,
      value: '설악산',
      expectedVersion: 0,
      leaseToken: title.token,
    });
    await saveBundleVisibility({ ...base, value: 'PRIVATE', expectedVersion: 0 });
    await saveBundleDate({
      ...base,
      value: '2026-10-18',
      expectedVersion: 0,
      leaseToken: date.token,
    });
    await saveBundleCaption({
      ...base,
      bundlePhotoId: firstPhoto.id,
      value: '케이블카',
      expectedVersion: 0,
      leaseToken: caption.token,
    });
    const saved = await saveBundleComment({ ...base, value: '내 코멘트', expectedVersion: 0 });

    expect(saved).toMatchObject({
      title: '설악산',
      titleVersion: 1,
      visibility: 'PRIVATE',
      visibilityVersion: 1,
      date: '2026-10-18',
      dateVersion: 1,
      dateChips: [],
      comments: [{ memberId: String(me), content: '내 코멘트', version: 1 }],
    });
    expect(saved.photos[0]).toMatchObject({ caption: '케이블카', captionVersion: 1 });
    // 날짜를 null로 저장하면 날짜 필드를 보내지 않아 해제됨
    const cleared = await saveBundleDate({
      ...base,
      value: null,
      expectedVersion: 1,
      leaseToken: date.token,
    });
    expect(cleared.date).toBeNull();
  });

  it('버전이 어긋나면 BUNDLE_003이고 현재 값과 버전을 읽을 수 있다', async () => {
    const draft = await createBundle(bunchId, photos, createIdempotencyKey());
    const base = { bunchId, bundleId: draft.id, mode: 'DRAFT' } as const;
    await saveBundleVisibility({ ...base, value: 'PUBLIC', expectedVersion: 0 });

    const error = await catchError(
      saveBundleVisibility({ ...base, value: 'PRIVATE', expectedVersion: 0 }),
    );

    expect(error).toMatchObject({ status: 409, code: 'BUNDLE_003' });
    expect(readVersionConflict(error)).toEqual({ value: 'PUBLIC', version: 1 });
    expect(readVersionConflict(new Error('x'))).toBeUndefined();
  });

  it('편집권 token 없이 제목을 저장하면 BUNDLE_004이다', async () => {
    const draft = await createBundle(bunchId, photos, createIdempotencyKey());

    await expect(
      saveBundleTitle({
        bunchId,
        bundleId: draft.id,
        value: '제목',
        expectedVersion: 0,
        mode: 'DRAFT',
      }),
    ).rejects.toMatchObject({ status: 409, code: 'BUNDLE_004' });
  });

  it('참여자를 더하고 제외하면 참여 목록이 바뀐다', async () => {
    const draft = await createBundle(bunchId, photos, createIdempotencyKey());

    const added = await addBundleParticipant(bunchId, draft.id, String(memberB));
    expect(added.participantIds).toEqual([String(me), String(memberA), String(memberB)]);
    expect(added.comments.find((c) => c.memberId === String(memberB))).toMatchObject({
      content: '',
    });

    const removed = await removeBundleParticipant(bunchId, draft.id, String(memberB));
    expect(removed.participantIds).toEqual([String(me), String(memberA)]);
    expect(removed.comments).toEqual([]);
  });

  it('발행 조건이 모자라면 BUNDLE_005 사유를 읽을 수 있다', async () => {
    const draft = await createBundle(bunchId, photos, createIdempotencyKey());

    const error = await catchError(
      publishBundle(bunchId, draft.id, draft.revision, createIdempotencyKey()),
    );

    expect(error).toMatchObject({ status: 409, code: 'BUNDLE_005' });
    expect(readPublishBlockers(error)).toEqual([
      'TITLE_REQUIRED',
      'VISIBILITY_REQUIRED',
      'COMMENTS_REQUIRED',
    ]);
    expect(readPublishBlockers(new Error('x'))).toBeUndefined();
  });

  it('응답이 계약과 다르면 성공으로 넘기지 않는다', async () => {
    server.use(http.get('/api/bunches/:bunchId/bundles/:id', () => ok({ id: 1, title: 'x' })));

    await expect(getBundle(bunchId, '1')).rejects.toMatchObject({ code: INVALID_RESPONSE_CODE });
  });

  it('안전하지 않은 사진 이미지 주소가 오면 성공으로 넘기지 않는다', async () => {
    const draft = await createBundle(bunchId, photos, createIdempotencyKey());
    mockDb.update((current) => ({
      ...current,
      bundles: current.bundles.map((bundle) => ({
        ...bundle,
        photos: bundle.photos.map((photo) => ({ ...photo, imageUrl: 'javascript:alert(1)' })),
      })),
    }));

    await expect(getBundle(bunchId, draft.id)).rejects.toMatchObject({
      code: INVALID_RESPONSE_CODE,
    });
  });
});

describe('편집권 통로', () => {
  it('획득·갱신·해제가 가짜 서버 규칙대로 동작한다', async () => {
    const draft = await createBundle(bunchId, photos, createIdempotencyKey());

    const granted = await leaseTransport.acquire(bunchId, draft.id, 'TITLE');
    expect(granted).toMatchObject({ target: 'TITLE', leaseVersion: 1 });

    const renewed = await leaseTransport.heartbeat(bunchId, draft.id, 'TITLE', granted.token);
    expect(renewed.token).toBe(granted.token);

    await leaseTransport.release(bunchId, draft.id, 'TITLE', granted.token);
    // 해제한 뒤에는 같은 token으로 갱신할 수 없음
    await expect(
      leaseTransport.heartbeat(bunchId, draft.id, 'TITLE', granted.token),
    ).rejects.toMatchObject({ status: 409, code: 'BUNDLE_004' });
  });

  it('다른 멤버가 쥔 대상은 얻을 수 없다(BUNDLE_004)', async () => {
    const draft = await createBundle(bunchId, photos, createIdempotencyKey());
    mockDb.update((current) => ({
      ...current,
      bundleLeases: [
        {
          bundleId: Number(draft.id),
          target: 'TITLE',
          memberId: memberA,
          token: createIdempotencyKey(),
          leaseVersion: 1,
          expiresAt: new Date(Date.now() + 10_000).toISOString(),
        },
      ],
    }));

    await expect(leaseTransport.acquire(bunchId, draft.id, 'TITLE')).rejects.toMatchObject({
      status: 409,
      code: 'BUNDLE_004',
    });
    // 상세 조회에는 누가 쥐고 있는지만 보임
    await expect(getBundle(bunchId, draft.id)).resolves.toMatchObject({
      leases: [{ target: 'TITLE', memberId: String(memberA) }],
    });
  });
});
