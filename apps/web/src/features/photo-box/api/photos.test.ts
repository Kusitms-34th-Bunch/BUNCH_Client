import { INVALID_RESPONSE_CODE } from '@app/api-core';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_MEMBER_IDS, MOCK_MY_MEMBER_ID, MOCK_PHOTO_IDS } from '@/mocks/db/seed';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { MissingPhotosError } from '../lib/missingPhotos';
import { changePhotoDates, removePhotos } from './photos';

const bunchId = String(MOCK_BUNCH_ID);
const photoIdsInDb = () => mockDb.get().photos.map((photo) => photo.photoId);
// 시작 데이터: 내가 혼자 올린 사진(S4), 다른 멤버가 올린 사진(S2)
const myPhoto = String(MOCK_PHOTO_IDS.S4);
const otherPhoto = String(MOCK_PHOTO_IDS.S2);

// 쓰기 요청은 가짜 DB가 실제로 바뀌는지, 보낸 본문이 계약 모양인지까지 확인
describe('removePhotos', () => {
  it('혼자 올린 사진은 사라지고 함께 올린 사진은 내 표시만 빠진다', async () => {
    // 다른 멤버가 같은 사진을 함께 올려 합쳐진 상태를 만듦
    const mergedId = MOCK_PHOTO_IDS.S5;
    mockDb.update((current) => ({
      ...current,
      photos: current.photos.map((photo) =>
        photo.photoId === mergedId
          ? { ...photo, uploaderIds: [MOCK_MEMBER_IDS.memberA, MOCK_MY_MEMBER_ID] }
          : photo,
      ),
    }));

    await expect(removePhotos(bunchId, [myPhoto, String(mergedId)])).resolves.toEqual({
      deletedCount: 1,
      uploaderRemovedCount: 1,
    });

    expect(photoIdsInDb()).not.toContain(MOCK_PHOTO_IDS.S4);
    const merged = mockDb.get().photos.find((photo) => photo.photoId === mergedId);
    expect(merged?.uploaderIds).toEqual([MOCK_MEMBER_IDS.memberA]);
  });

  it('화면 문자열 id를 서버 숫자 id로 바꿔 본문에 담는다', async () => {
    let body: unknown;
    server.use(
      // handler 안에서 expect하면 실패가 500 응답으로 바뀌어 원인이 가려지므로 밖에서 확인
      http.post('/api/bunches/:bunchId/photos/delete', async ({ request }) => {
        body = await request.json();
        return ok({ deletedCount: 2, uploaderRemovedCount: 0 });
      }),
    );

    await removePhotos(bunchId, ['1', '2']);
    expect(body).toEqual({ photoIds: [1, 2] });
  });

  it('서버 숫자로 바꿀 수 없는 id는 요청하지 않고 오류다', async () => {
    const before = photoIdsInDb();

    await expect(removePhotos(bunchId, [myPhoto, 'temp-1'])).rejects.toMatchObject({
      name: 'ApiError',
      category: 'validation',
    });
    expect(photoIdsInDb()).toEqual(before);
  });

  it('일반 멤버가 남의 사진을 섞으면 거부되고 아무것도 지우지 않는다', async () => {
    const before = photoIdsInDb();

    await expect(removePhotos(bunchId, [myPhoto, otherPhoto])).rejects.toMatchObject({
      status: 403,
    });
    expect(photoIdsInDb()).toEqual(before);
  });

  it('관리자는 남의 사진도 지울 수 있다', async () => {
    mockDb.update((current) => ({
      ...current,
      memberships: current.memberships.map((membership) =>
        membership.memberId === MOCK_MY_MEMBER_ID ? { ...membership, role: 'OWNER' } : membership,
      ),
    }));

    await expect(removePhotos(bunchId, [otherPhoto])).resolves.toEqual({
      deletedCount: 1,
      uploaderRemovedCount: 0,
    });
    expect(photoIdsInDb()).not.toContain(MOCK_PHOTO_IDS.S2);
  });

  it('이미 사라진 사진이 섞이면 409 PHOTO_004로 거절하고 사라진 사진 id를 알리며 아무것도 지우지 않는다', async () => {
    const before = photoIdsInDb();

    const error = await removePhotos(bunchId, [myPhoto, '999', '998']).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(MissingPhotosError);
    expect((error as MissingPhotosError).missingIds).toEqual(['999', '998']);
    expect(photoIdsInDb()).toEqual(before);
  });

  it.each([
    [403, 'AUTH_002', 'auth'],
    [500, 'COMMON_500', 'server'],
  ] as const)('%i 응답은 %s 코드의 %s ApiError다', async (status, code, category) => {
    server.use(http.post('/api/bunches/:bunchId/photos/delete', () => fail(status, code)));

    await expect(removePhotos(bunchId, ['1'])).rejects.toMatchObject({ status, code, category });
  });

  it('응답 개수가 계약과 다르면 성공으로 넘기지 않는다', async () => {
    server.use(
      http.post('/api/bunches/:bunchId/photos/delete', () =>
        ok({ deletedCount: '1', uploaderRemovedCount: 0 }),
      ),
    );

    await expect(removePhotos(bunchId, ['1'])).rejects.toMatchObject({
      code: INVALID_RESPONSE_CODE,
    });
  });
});

describe('changePhotoDates', () => {
  const findPhoto = (id: number) => mockDb.get().photos.find((photo) => photo.photoId === id);

  it('고른 사진의 촬영 날짜만 바꾸고 시각은 그대로 둔다', async () => {
    const before = findPhoto(MOCK_PHOTO_IDS.S4);

    await expect(changePhotoDates(bunchId, [myPhoto], new Date(2026, 9, 5))).resolves.toEqual({
      updatedCount: 1,
    });

    expect(findPhoto(MOCK_PHOTO_IDS.S4)).toMatchObject({
      capturedDate: '2026-10-05',
      capturedTime: before?.capturedTime,
    });
  });

  it('기기 시간대의 그날을 yyyy-MM-dd로 만들어 photoIds와 capturedDate만 본문에 담는다', async () => {
    let body: unknown;
    server.use(
      http.post('/api/bunches/:bunchId/photos/date', async ({ request }) => {
        body = await request.clone().json();
        return undefined;
      }),
    );

    await changePhotoDates(bunchId, [myPhoto], new Date(2026, 0, 5));

    expect(body).toEqual({ photoIds: [MOCK_PHOTO_IDS.S4], capturedDate: '2026-01-05' });
  });

  it('고른 사진이 그사이 지워졌으면 409 PHOTO_004로 거절하고 아무것도 바꾸지 않는다', async () => {
    const before = findPhoto(MOCK_PHOTO_IDS.S4);

    const error = await changePhotoDates(bunchId, [myPhoto, '999'], new Date(2026, 9, 5)).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(MissingPhotosError);
    expect((error as MissingPhotosError).missingIds).toEqual(['999']);
    expect(findPhoto(MOCK_PHOTO_IDS.S4)).toEqual(before);
  });

  it('일반 멤버가 다른 멤버만 올린 사진을 섞으면 403 AUTH_002로 거절하고 아무것도 바꾸지 않는다', async () => {
    const before = findPhoto(MOCK_PHOTO_IDS.S4);

    await expect(
      changePhotoDates(bunchId, [myPhoto, otherPhoto], new Date(2026, 9, 5)),
    ).rejects.toMatchObject({ status: 403, code: 'AUTH_002' });
    expect(findPhoto(MOCK_PHOTO_IDS.S4)).toEqual(before);
  });

  it('오늘(Asia/Seoul) 이후 날짜는 400 COMMON_001이다', async () => {
    await expect(
      changePhotoDates(bunchId, [myPhoto], new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
    ).rejects.toMatchObject({ status: 400, code: 'COMMON_001' });
  });

  it('화면 id가 서버 숫자로 바뀌지 않으면 요청 없이 거절한다', async () => {
    await expect(changePhotoDates(bunchId, ['abc'], new Date(2026, 9, 5))).rejects.toMatchObject({
      category: 'validation',
    });
  });
});
