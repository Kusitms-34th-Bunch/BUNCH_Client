import { INVALID_RESPONSE_CODE } from '@app/api-core';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_PHOTO_IDS } from '@/mocks/db/seed';
import { ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { getPhotoDetail } from './photos';

const bunchId = String(MOCK_BUNCH_ID);

describe('getPhotoDetail', () => {
  it('사진의 원본 이미지 주소를 돌려준다', async () => {
    await expect(getPhotoDetail(bunchId, String(MOCK_PHOTO_IDS.S1))).resolves.toEqual({
      id: String(MOCK_PHOTO_IDS.S1),
      imageSrc: '/mock/photos/S1.jpg',
    });
  });

  it('날짜를 모르는 사진도 조회된다(날짜 필드 생략)', async () => {
    mockDb.update((current) => ({
      ...current,
      photos: current.photos.map((photo) =>
        photo.photoId === MOCK_PHOTO_IDS.O1
          ? { ...photo, capturedDate: null, capturedTime: null }
          : photo,
      ),
    }));

    await expect(getPhotoDetail(bunchId, String(MOCK_PHOTO_IDS.O1))).resolves.toMatchObject({
      imageSrc: '/mock/photos/O1.jpg',
    });
  });

  it('날짜 미확인 목록 경로(undated)는 사진 상세로 잘못 맞지 않는다', async () => {
    const response = await fetch(`/api/bunches/${bunchId}/photos/undated`);
    expect(response.status).toBe(200);
  });

  it.each([
    ['없는 사진', bunchId, '999', 404, 'RESOURCE_001'],
    ['없는 번치', '999', '1', 404, 'RESOURCE_001'],
    ['숫자가 아닌 사진 id', bunchId, 'abc', 400, 'COMMON_001'],
  ] as const)('%s는 %i %s 오류다', async (_name, bunch, photo, status, code) => {
    await expect(getPhotoDetail(bunch, photo)).rejects.toMatchObject({ status, code });
  });

  it('내가 소속이 아니면 AUTH_002(403)이다', async () => {
    mockDb.update((current) => ({ ...current, memberships: [] }));
    await expect(getPhotoDetail(bunchId, '1')).rejects.toMatchObject({
      status: 403,
      code: 'AUTH_002',
    });
  });

  it('응답이 계약과 다르면 성공으로 넘기지 않는다', async () => {
    server.use(
      http.get('/api/bunches/:bunchId/photos/:photoId', () => ok({ photoId: 1, uploaders: [] })),
    );
    await expect(getPhotoDetail(bunchId, '1')).rejects.toMatchObject({
      code: INVALID_RESPONSE_CODE,
    });
  });
});
