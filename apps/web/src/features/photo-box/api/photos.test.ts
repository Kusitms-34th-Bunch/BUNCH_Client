import { INVALID_RESPONSE_CODE } from '@app/api-core';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_MEMBER_IDS, MOCK_MY_MEMBER_ID, MOCK_PHOTO_IDS } from '@/mocks/db/seed';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { removePhotos } from './photos';

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

  // 오류 코드와 전부 거부 여부는 서버 확인 전이라 가짜 서버 기준
  it('이미 사라진 사진이 섞이면 RESOURCE_001이고 아무것도 지우지 않는다', async () => {
    const before = photoIdsInDb();

    await expect(removePhotos(bunchId, [myPhoto, '999'])).rejects.toMatchObject({
      status: 404,
      code: 'RESOURCE_001',
    });
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
