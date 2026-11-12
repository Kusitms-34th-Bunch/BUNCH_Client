import { http } from 'msw';
import { toWireId } from '@/shared/api/ids';
import type { MockPhoto } from '../db/types';
import { mockDb } from '../db';
import { MOCK_MY_MEMBER_ID } from '../db/seed';
import { fail, ok } from '../lib/envelope';

const DEFAULT_PAGE_SIZE = 60;
const MAX_PAGE_SIZE = 100;

// 날짜 최신순, 같은 날짜는 시각 최신순, 시각까지 같으면 id 오름차순
// 날짜를 모르는 사진은 업로드 최신순(명세)이라 id 내림차순
const byNewest = (a: MockPhoto, b: MockPhoto) =>
  (b.capturedDate ?? '').localeCompare(a.capturedDate ?? '') ||
  (b.capturedTime ?? '').localeCompare(a.capturedTime ?? '') ||
  (a.capturedDate === null ? b.photoId - a.photoId : a.photoId - b.photoId);

const encodeCursor = (photoId: number) => btoa(String(photoId));
const decodeCursor = (cursor: string) => {
  try {
    const photoId = Number(atob(cursor));
    return Number.isSafeInteger(photoId) ? photoId : undefined;
  } catch {
    return undefined;
  }
};

// 없으면 undefined, 양의 정수가 아니면 NaN
const parsePositiveInt = (value: string | null) => {
  if (value === null) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : NaN;
};

type PhotoListQuery = { memberId: number | undefined; cursor: string | undefined; size: number };

const parseListQuery = (url: URL): PhotoListQuery | undefined => {
  const memberId = parsePositiveInt(url.searchParams.get('memberId'));
  const size = parsePositiveInt(url.searchParams.get('size')) ?? DEFAULT_PAGE_SIZE;
  if (Number.isNaN(memberId) || Number.isNaN(size) || size > MAX_PAGE_SIZE) return undefined;
  return { memberId, cursor: url.searchParams.get('cursor') || undefined, size };
};

// 번치 접근 검사 뒤 정렬된 사진의 한 페이지를 만들고, 조건에 맞지 않으면 오류 응답을 돌려줌
const listPhotos = (
  bunchIdParam: string | readonly string[] | undefined,
  url: URL,
  dated: boolean,
) => {
  const bunchId = toWireId(bunchIdParam);
  const query = parseListQuery(url);
  if (bunchId === undefined || !query) return { error: fail(400, 'COMMON_001') };

  const { bunches, memberships, photos } = mockDb.get();
  if (!bunches.some((bunch) => bunch.id === bunchId)) return { error: fail(404, 'RESOURCE_001') };
  const bunchMemberships = memberships.filter((membership) => membership.bunchId === bunchId);
  if (!bunchMemberships.some((membership) => membership.memberId === MOCK_MY_MEMBER_ID)) {
    return { error: fail(403, 'AUTH_002') };
  }
  const { memberId } = query;
  if (
    memberId !== undefined &&
    !bunchMemberships.some((membership) => membership.memberId === memberId)
  ) {
    return { error: fail(400, 'COMMON_001') };
  }

  const matched = photos
    .filter(
      (photo) =>
        photo.bunchId === bunchId &&
        (photo.capturedDate !== null) === dated &&
        (memberId === undefined || photo.uploaderIds.includes(memberId)),
    )
    .sort(byNewest);

  let start = 0;
  if (query.cursor !== undefined) {
    const lastId = decodeCursor(query.cursor);
    const lastIndex = matched.findIndex((photo) => photo.photoId === lastId);
    if (lastIndex < 0) return { error: fail(400, 'COMMON_001') };
    start = lastIndex + 1;
  }
  const page = matched.slice(start, start + query.size);
  const last = page.at(-1);
  return {
    totalCount: matched.length,
    page,
    nextCursor:
      start + query.size < matched.length && last ? encodeCursor(last.photoId) : undefined,
  };
};

const isPhotoIdList = (value: unknown): value is number[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((id) => typeof id === 'number' && Number.isSafeInteger(id) && id > 0);

const MAX_PHOTOS_IN_BOX = 1000;
const MAX_PHOTOS_PER_BATCH = 50;
// 같은 uploadBatchId로 받은 요청 수(서버는 한 번에 50장까지만 받음)
const batchCounts = new Map<string, number>();

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
// 서버는 오늘(Asia/Seoul) 이후 날짜를 거절함('yyyy-MM-dd'라 문자열 비교로 충분)
const todayInSeoul = () => new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
const TIME = /^\d{2}:\d{2}:\d{2}$/;

type UploadRequest = {
  uploadBatchId: string;
  capturedDate: string | null;
  capturedTime: string | null;
  /** 가공 전 원본 파일의 SHA-256(소문자 hex 64자). 있으면 같은 사진 판별에 업로드 파일 해시 대신 씀 */
  originalFileHash: string | null;
};

// 업로드 요청의 별도 필드(uploadBatchId·capturedDate·capturedTime)를 검사함. 올바르지 않으면 undefined(서버는 COMMON_001): 묶음 ID는 UUID, 시각은 날짜 없이 보낼 수 없음
const parseUploadRequest = (form: FormData | null) => {
  if (!form) return undefined;
  const uploadBatchId = form.get('uploadBatchId');
  const capturedDate = form.get('capturedDate') ?? undefined;
  const capturedTime = form.get('capturedTime') ?? undefined;
  const originalFileHash = form.get('originalFileHash') ?? undefined;
  if (typeof uploadBatchId !== 'string' || !UUID.test(uploadBatchId)) return undefined;
  if (
    capturedDate !== undefined &&
    (typeof capturedDate !== 'string' || !DATE.test(capturedDate))
  ) {
    return undefined;
  }
  if (
    capturedTime !== undefined &&
    (typeof capturedTime !== 'string' || !TIME.test(capturedTime))
  ) {
    return undefined;
  }
  if (capturedTime !== undefined && capturedDate === undefined) return undefined;
  if (
    originalFileHash !== undefined &&
    (typeof originalFileHash !== 'string' || !/^[0-9a-f]{64}$/.test(originalFileHash))
  ) {
    return undefined;
  }
  return {
    uploadBatchId,
    capturedDate: capturedDate ?? null,
    capturedTime: capturedTime ?? null,
    originalFileHash: originalFileHash ?? null,
  } satisfies UploadRequest;
};

const sha256Hex = async (file: Blob) => {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const photoHandlers = [
  // GET /api/v1/bunches/{bunchId}/photos
  // 날짜를 아는 사진을 최신순으로(memberId로 올린 사람 필터, cursor 페이지)
  http.get('/api/bunches/:bunchId/photos', ({ params, request }) => {
    const result = listPhotos(params.bunchId, new URL(request.url), true);
    if (result.error) return result.error;
    return ok({
      totalCount: result.totalCount,
      photos: result.page.map((photo) => ({
        photoId: photo.photoId,
        thumbnailUrl: photo.thumbnailUrl,
        capturedDate: photo.capturedDate,
        capturedTime: photo.capturedTime,
        uploaderIds: photo.uploaderIds,
      })),
      nextCursor: result.nextCursor,
    });
  }),

  // GET /api/v1/bunches/{bunchId}/photos/undated
  http.get('/api/bunches/:bunchId/photos/undated', ({ params, request }) => {
    const result = listPhotos(params.bunchId, new URL(request.url), false);
    if (result.error) return result.error;
    return ok({
      totalCount: result.totalCount,
      photos: result.page.map((photo) => ({
        photoId: photo.photoId,
        thumbnailUrl: photo.thumbnailUrl,
        uploaderIds: photo.uploaderIds,
      })),
      nextCursor: result.nextCursor,
    });
  }),

  // POST /api/v1/bunches/{bunchId}/photos
  // 사진 1장 업로드(multipart: photo 파일 + uploadBatchId·capturedDate·capturedTime 별도 필드). 같은 번치에 같은 파일(바이트의 SHA-256)이 있으면 합침:
  // 내가 이미 올렸으면 ALREADY_UPLOADED, 다른 멤버가 올렸으면 MERGED(올린 사람에 내가 추가), 없으면 STORED
  // 한도(가짜 서버의 가정이며 서버 확인 전): 사진함 1,000장은 새 사진만(합치기는 허용), 같은 묶음 50장. 하루 100장(PHOTO_002)은 가짜 서버에서 흉내 내지 않음
  http.post('/api/bunches/:bunchId/photos', async ({ params, request }) => {
    const bunchId = toWireId(params.bunchId);
    if (bunchId === undefined) return fail(400, 'COMMON_001');

    const { bunches, memberships, photos } = mockDb.get();
    if (!bunches.some((bunch) => bunch.id === bunchId)) return fail(404, 'RESOURCE_001');
    if (
      !memberships.some(
        (membership) => membership.bunchId === bunchId && membership.memberId === MOCK_MY_MEMBER_ID,
      )
    ) {
      return fail(403, 'AUTH_002');
    }

    const form = await request.formData().catch(() => null);
    const file = form?.get('photo');
    const upload = parseUploadRequest(form ?? null);
    // 서버는 JPEG만 받음
    if (!(file instanceof Blob) || file.size === 0 || file.type !== 'image/jpeg' || !upload) {
      return fail(400, 'COMMON_001');
    }

    const batchCount = batchCounts.get(upload.uploadBatchId) ?? 0;
    if (batchCount >= MAX_PHOTOS_PER_BATCH) return fail(409, 'PHOTO_003');

    // 원본 해시가 있으면 그 값으로, 없으면 업로드된 파일의 SHA-256으로 같은 사진을 판별함
    const contentHash = upload.originalFileHash ?? (await sha256Hex(file));
    const bunchPhotos = photos.filter((photo) => photo.bunchId === bunchId);
    const same = bunchPhotos.find((photo) => photo.contentHash === contentHash);
    if (!same && bunchPhotos.length >= MAX_PHOTOS_IN_BOX) return fail(409, 'PHOTO_001');
    batchCounts.set(upload.uploadBatchId, batchCount + 1);

    if (same) {
      if (same.uploaderIds.includes(MOCK_MY_MEMBER_ID)) {
        return ok({ photoId: same.photoId, result: 'ALREADY_UPLOADED' });
      }
      mockDb.update((current) => ({
        ...current,
        photos: current.photos.map((photo) =>
          photo.photoId === same.photoId
            ? { ...photo, uploaderIds: [...photo.uploaderIds, MOCK_MY_MEMBER_ID] }
            : photo,
        ),
      }));
      return ok({ photoId: same.photoId, result: 'MERGED' });
    }

    // 올린 파일은 보관하지 않고 시작 데이터의 사진 이미지로 대신 보임
    const sample = bunchPhotos[0] ?? photos[0];
    const photoId = Math.max(0, ...photos.map((photo) => photo.photoId)) + 1;
    mockDb.update((current) => ({
      ...current,
      photos: [
        ...current.photos,
        {
          photoId,
          bunchId,
          uploaderIds: [MOCK_MY_MEMBER_ID],
          capturedDate: upload.capturedDate,
          capturedTime: upload.capturedTime,
          thumbnailUrl: sample?.thumbnailUrl ?? '',
          imageUrl: sample?.imageUrl ?? '',
          contentHash,
        },
      ],
    }));
    return ok({ photoId, result: 'STORED' });
  }),

  // POST /api/v1/bunches/{bunchId}/photos/delete
  // 멤버는 내가 올린 사진만, 관리자는 모든 사진(docs/specs/photo-box.md 3.3.5). 합쳐진 사진은 내 표시만 빠지고 마지막 사람이 지우면 삭제
  http.post('/api/bunches/:bunchId/photos/delete', async ({ params, request }) => {
    const bunchId = toWireId(params.bunchId);
    const body: unknown = await request.json().catch(() => null);
    const photoIds = (body as { photoIds?: unknown } | null)?.photoIds;
    // 서버는 빈 목록·50개 초과·중복·1 미만 ID를 400 COMMON_001로 거절함
    if (
      bunchId === undefined ||
      !isPhotoIdList(photoIds) ||
      photoIds.length > 50 ||
      new Set(photoIds).size !== photoIds.length
    ) {
      return fail(400, 'COMMON_001');
    }

    const { memberships, photos } = mockDb.get();
    const myRole = memberships.find(
      (membership) => membership.bunchId === bunchId && membership.memberId === MOCK_MY_MEMBER_ID,
    )?.role;
    if (!myRole) return fail(403, 'AUTH_002');

    const targets = photos.filter(
      (photo) => photo.bunchId === bunchId && photoIds.includes(photo.photoId),
    );
    // 고른 사진 중 일부가 그사이 지워졌으면 아무것도 삭제하지 않고 사라진 사진 ID를 요청한 순서대로 알림
    const missingPhotoIds = photoIds.filter((id) => !targets.some((photo) => photo.photoId === id));
    if (missingPhotoIds.length > 0) return fail(409, 'PHOTO_004', { missingPhotoIds });
    const isAdmin = myRole !== 'MEMBER';
    if (!isAdmin && targets.some((photo) => !photo.uploaderIds.includes(MOCK_MY_MEMBER_ID))) {
      return fail(403, 'AUTH_002');
    }

    // 다른 업로더가 남은 합쳐진 사진은 내 표시만 빠짐
    // ponytail: 관리자가 남의 사진을 지우면 통째로 삭제한다고 가정, 서버 동작 확인 시 교체
    const keepsOthers = (photo: (typeof targets)[number]) =>
      photo.uploaderIds.includes(MOCK_MY_MEMBER_ID) && photo.uploaderIds.length > 1;
    const uploaderRemovedCount = targets.filter(keepsOthers).length;
    const deletedCount = targets.length - uploaderRemovedCount;

    mockDb.update((current) => ({
      ...current,
      photos: current.photos.flatMap((photo) => {
        if (!targets.includes(photo)) return [photo];
        if (!keepsOthers(photo)) return [];
        return [
          { ...photo, uploaderIds: photo.uploaderIds.filter((id) => id !== MOCK_MY_MEMBER_ID) },
        ];
      }),
    }));
    return ok({ deletedCount, uploaderRemovedCount });
  }),

  // POST /api/v1/bunches/{bunchId}/photos/date
  // 고른 사진(1~50장, 중복 불가)의 촬영 날짜만 바꿈(시각 유지). 전부 성공 또는 전부 실패
  // 확인 순서(서버 명세): 입력·날짜 400 → 번치·소속 → 사라진 사진 409 PHOTO_004 → 권한 403 AUTH_002
  // 날짜 없음으로 되돌리는 clearDate는 날짜 미확인 사진을 끌 수 없어 화면이 부르지 않으므로 가짜 서버도 받지 않음(400)
  http.post('/api/bunches/:bunchId/photos/date', async ({ params, request }) => {
    const bunchId = toWireId(params.bunchId);
    const body = (await request.json().catch(() => null)) as {
      photoIds?: unknown;
      capturedDate?: unknown;
      clearDate?: unknown;
    } | null;
    const photoIds = body?.photoIds;
    const capturedDate = body?.capturedDate;
    if (
      bunchId === undefined ||
      !isPhotoIdList(photoIds) ||
      photoIds.length > 50 ||
      new Set(photoIds).size !== photoIds.length ||
      body?.clearDate === true ||
      typeof capturedDate !== 'string' ||
      !DATE.test(capturedDate) ||
      capturedDate > todayInSeoul()
    ) {
      return fail(400, 'COMMON_001');
    }

    const { bunches, memberships, photos } = mockDb.get();
    if (!bunches.some((bunch) => bunch.id === bunchId)) return fail(404, 'RESOURCE_001');
    const myRole = memberships.find(
      (membership) => membership.bunchId === bunchId && membership.memberId === MOCK_MY_MEMBER_ID,
    )?.role;
    if (!myRole) return fail(403, 'AUTH_002');

    const targets = photos.filter(
      (photo) => photo.bunchId === bunchId && photoIds.includes(photo.photoId),
    );
    const missingPhotoIds = photoIds.filter((id) => !targets.some((photo) => photo.photoId === id));
    if (missingPhotoIds.length > 0) return fail(409, 'PHOTO_004', { missingPhotoIds });
    // 일반 멤버가 다른 멤버만 올린 사진을 하나라도 섞으면 아무것도 바꾸지 않음(함께 올린 사진은 올린 멤버 누구라도 가능)
    const isAdmin = myRole !== 'MEMBER';
    if (!isAdmin && targets.some((photo) => !photo.uploaderIds.includes(MOCK_MY_MEMBER_ID))) {
      return fail(403, 'AUTH_002');
    }

    mockDb.update((current) => ({
      ...current,
      photos: current.photos.map((photo) =>
        targets.includes(photo) ? { ...photo, capturedDate } : photo,
      ),
    }));
    return ok({ updatedCount: targets.length });
  }),

  // GET /api/v1/bunches/{bunchId}/photos/{photoId}
  // 원본 이미지 주소와 올린 사람(같은 사진을 함께 올린 멤버 모두). 날짜를 모르면 capturedDate는 생략
  // msw는 먼저 맞는 handler를 쓰므로 /photos/undated 뒤에 둠
  http.get('/api/bunches/:bunchId/photos/:photoId', ({ params }) => {
    const bunchId = toWireId(params.bunchId);
    const photoId = toWireId(params.photoId);
    if (bunchId === undefined || photoId === undefined) return fail(400, 'COMMON_001');

    const { bunches, memberships, members, photos } = mockDb.get();
    if (!bunches.some((bunch) => bunch.id === bunchId)) return fail(404, 'RESOURCE_001');
    const bunchMemberships = memberships.filter((membership) => membership.bunchId === bunchId);
    if (!bunchMemberships.some((membership) => membership.memberId === MOCK_MY_MEMBER_ID)) {
      return fail(403, 'AUTH_002');
    }
    const photo = photos.find((item) => item.bunchId === bunchId && item.photoId === photoId);
    if (!photo) return fail(404, 'RESOURCE_001');

    return ok({
      photoId: photo.photoId,
      imageUrl: photo.imageUrl,
      ...(photo.capturedDate ? { capturedDate: photo.capturedDate } : {}),
      uploaders: photo.uploaderIds.flatMap((memberId) => {
        const member = members.find((item) => item.memberId === memberId);
        return member ? [{ memberId, nickname: member.nickname, imageUrl: member.imageUrl }] : [];
      }),
    });
  }),
];
