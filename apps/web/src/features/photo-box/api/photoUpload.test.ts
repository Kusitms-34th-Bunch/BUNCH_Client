import { ApiError } from '@app/api-core';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { mockDb } from '@/mocks/db';
import { MOCK_BUNCH_ID, MOCK_MEMBER_IDS } from '@/mocks/db/seed';
import { fail, ok } from '@/mocks/lib/envelope';
import { server } from '@/mocks/server';
import { isRetryableUploadError } from '../lib/photoUpload';
import { uploadPhoto } from './photoUpload';

const bunchId = String(MOCK_BUNCH_ID);
const batchId = () => crypto.randomUUID();

// 서버가 파일 바이트의 SHA-256으로 같은 사진을 판별하므로 바이트가 다른 JPEG를 만들어 씀
const jpeg = (seed: string) => new Blob([`jpeg-bytes-${seed}`], { type: 'image/jpeg' });

const sha256Hex = async (blob: Blob) => {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const findPhoto = (photoId: number) =>
  mockDb.get().photos.find((photo) => photo.photoId === photoId);
const photoCount = () =>
  mockDb.get().photos.filter((photo) => photo.bunchId === MOCK_BUNCH_ID).length;

const uploadError = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('업로드가 실패해야 해요.');
};

describe('uploadPhoto', () => {
  it('새 사진은 STORED로 저장되고 촬영 날짜·시각이 그대로 들어간다', async () => {
    const before = photoCount();

    const result = await uploadPhoto({
      bunchId,
      image: jpeg('new-1'),
      uploadBatchId: batchId(),
      capturedDate: '2026-10-19',
      capturedTime: '19:30:05',
    });

    expect(result.result).toBe('STORED');
    expect(photoCount()).toBe(before + 1);
    expect(findPhoto(result.photoId)).toMatchObject({
      bunchId: MOCK_BUNCH_ID,
      capturedDate: '2026-10-19',
      capturedTime: '19:30:05',
    });
  });

  it('촬영 날짜가 없으면 날짜 미확인 사진이 된다', async () => {
    const result = await uploadPhoto({
      bunchId,
      image: jpeg('undated-1'),
      uploadBatchId: batchId(),
    });

    expect(findPhoto(result.photoId)).toMatchObject({ capturedDate: null, capturedTime: null });
  });

  it('촬영 시각만 있고 날짜가 없으면 시각은 보내지 않는다(서버는 날짜 없는 시각을 거절)', async () => {
    const result = await uploadPhoto({
      bunchId,
      image: jpeg('time-only-1'),
      uploadBatchId: batchId(),
      capturedTime: '19:30:05',
    });

    expect(result.result).toBe('STORED');
    expect(findPhoto(result.photoId)).toMatchObject({ capturedDate: null, capturedTime: null });
  });

  it('요청은 photo 파일 파트와 request JSON 파트로 보낸다', async () => {
    const parts: { request: unknown; requestType: string; fileName: string; fileType: string } = {
      request: undefined,
      requestType: '',
      fileName: '',
      fileType: '',
    };
    const id = batchId();
    server.use(
      http.post('/api/bunches/:bunchId/photos', async ({ request }) => {
        // 본문을 복제해서 읽어야 이어서 응답하는 기본 가짜 서버 handler가 다시 읽을 수 있음
        const form = await request.clone().formData();
        const file = form.get('photo');
        const json = form.get('request');
        parts.requestType = json instanceof Blob ? json.type : 'string';
        parts.request = JSON.parse(typeof json === 'string' ? json : await (json as Blob).text());
        parts.fileName = file instanceof File ? file.name : '';
        parts.fileType = file instanceof Blob ? file.type : '';
        // 이어서 기본 가짜 서버 handler가 응답
        return undefined;
      }),
    );

    await uploadPhoto({
      bunchId,
      image: jpeg('parts-1'),
      uploadBatchId: id,
      capturedDate: '2026-10-19',
      capturedTime: '19:30:05',
    });

    expect(parts.request).toEqual({
      uploadBatchId: id,
      capturedDate: '2026-10-19',
      capturedTime: '19:30:05',
    });
    // Spring @RequestPart는 request 파트가 application/json이어야 읽으므로 type이 빠지면 안 됨
    expect(parts.requestType).toBe('application/json');
    expect(parts.fileName).toBe('photo.jpg');
    expect(parts.fileType).toBe('image/jpeg');
  });

  it('내가 이미 올린 같은 파일은 ALREADY_UPLOADED이고 새 사진이 생기지 않는다', async () => {
    const image = jpeg('dup-me');
    const first = await uploadPhoto({ bunchId, image, uploadBatchId: batchId() });
    const before = photoCount();

    const second = await uploadPhoto({ bunchId, image, uploadBatchId: batchId() });

    expect(second).toEqual({ photoId: first.photoId, result: 'ALREADY_UPLOADED' });
    expect(photoCount()).toBe(before);
  });

  it('다른 멤버가 올린 같은 파일은 MERGED로 합쳐지고 올린 사람에 내가 추가된다', async () => {
    const image = jpeg('dup-other');
    const hash = await sha256Hex(image);
    const sample = mockDb.get().photos[0]!;
    const otherPhotoId = 9_000;
    mockDb.update((current) => ({
      ...current,
      photos: [
        ...current.photos,
        {
          ...sample,
          photoId: otherPhotoId,
          bunchId: MOCK_BUNCH_ID,
          uploaderIds: [MOCK_MEMBER_IDS.memberB],
          contentHash: hash,
        },
      ],
    }));
    const before = photoCount();

    const result = await uploadPhoto({ bunchId, image, uploadBatchId: batchId() });

    expect(result).toEqual({ photoId: otherPhotoId, result: 'MERGED' });
    expect(photoCount()).toBe(before);
    expect(findPhoto(otherPhotoId)?.uploaderIds).toEqual([
      MOCK_MEMBER_IDS.memberB,
      MOCK_MEMBER_IDS.me,
    ]);
  });

  it('사진함이 1,000장이면 새 사진은 PHOTO_001로 거절되지만 같은 사진 합치기는 허용된다', async () => {
    const sample = mockDb.get().photos[0]!;
    const merged = jpeg('full-merge');
    mockDb.update((current) => ({
      ...current,
      photos: [
        ...current.photos.filter((photo) => photo.bunchId !== MOCK_BUNCH_ID),
        ...Array.from({ length: 1000 }, (_, index) => ({
          ...sample,
          photoId: 20_000 + index,
          bunchId: MOCK_BUNCH_ID,
          uploaderIds: [MOCK_MEMBER_IDS.memberB],
          ...(index === 0 ? { contentHash: 'placeholder' } : {}),
        })),
      ],
    }));
    const hash = await sha256Hex(merged);
    mockDb.update((current) => ({
      ...current,
      photos: current.photos.map((photo) =>
        photo.photoId === 20_000 ? { ...photo, contentHash: hash } : photo,
      ),
    }));

    const error = await uploadError(
      uploadPhoto({ bunchId, image: jpeg('full-new'), uploadBatchId: batchId() }),
    );
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('PHOTO_001');
    expect(isRetryableUploadError(error)).toBe(false);

    const result = await uploadPhoto({ bunchId, image: merged, uploadBatchId: batchId() });
    expect(result.result).toBe('MERGED');
  });

  it('같은 묶음으로 51번째 사진은 PHOTO_003으로 거절된다', async () => {
    const id = batchId();
    for (let index = 0; index < 50; index += 1) {
      await uploadPhoto({ bunchId, image: jpeg(`batch-${index}`), uploadBatchId: id });
    }

    const error = await uploadError(
      uploadPhoto({ bunchId, image: jpeg('batch-over'), uploadBatchId: id }),
    );

    expect((error as ApiError).code).toBe('PHOTO_003');
  });

  it('빈 파일은 COMMON_001로 거절된다', async () => {
    const error = await uploadError(
      uploadPhoto({
        bunchId,
        image: new Blob([], { type: 'image/jpeg' }),
        uploadBatchId: batchId(),
      }),
    );

    expect((error as ApiError).code).toBe('COMMON_001');
  });

  it('번치 소속이 아니면 AUTH_002, 없는 번치는 RESOURCE_001로 거절된다', async () => {
    mockDb.update((current) => ({
      ...current,
      memberships: current.memberships.filter(
        (membership) =>
          !(membership.bunchId === MOCK_BUNCH_ID && membership.memberId === MOCK_MEMBER_IDS.me),
      ),
    }));
    const forbidden = await uploadError(
      uploadPhoto({ bunchId, image: jpeg('auth-1'), uploadBatchId: batchId() }),
    );
    expect((forbidden as ApiError).code).toBe('AUTH_002');

    const missing = await uploadError(
      uploadPhoto({ bunchId: '999999', image: jpeg('auth-2'), uploadBatchId: batchId() }),
    );
    expect((missing as ApiError).code).toBe('RESOURCE_001');
  });

  it('알 수 없는 result나 잘못된 사진 id 응답은 계약 위반으로 오류를 던진다', async () => {
    server.use(
      http.post('/api/bunches/:bunchId/photos', () => ok({ photoId: 1, result: 'UNKNOWN' })),
    );
    const unknownResult = await uploadError(
      uploadPhoto({ bunchId, image: jpeg('contract-1'), uploadBatchId: batchId() }),
    );
    expect(unknownResult).toBeInstanceOf(ApiError);

    server.use(
      http.post('/api/bunches/:bunchId/photos', () => ok({ photoId: 0, result: 'STORED' })),
    );
    const badId = await uploadError(
      uploadPhoto({ bunchId, image: jpeg('contract-2'), uploadBatchId: batchId() }),
    );
    expect(badId).toBeInstanceOf(ApiError);
  });

  it('이미지 저장소 일시 장애(503 PHOTO_007)는 다시 시도할 수 있는 오류로 던진다', async () => {
    server.use(http.post('/api/bunches/:bunchId/photos', () => fail(503, 'PHOTO_007')));

    const error = await uploadError(
      uploadPhoto({ bunchId, image: jpeg('retry-1'), uploadBatchId: batchId() }),
    );

    expect((error as ApiError).code).toBe('PHOTO_007');
    expect(isRetryableUploadError(error)).toBe(true);
  });
});
