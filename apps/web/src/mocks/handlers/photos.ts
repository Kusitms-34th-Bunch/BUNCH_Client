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

  // POST /api/v1/bunches/{bunchId}/photos/delete
  // 멤버는 내가 올린 사진만, 관리자는 모든 사진(docs/specs/photo-box.md 3.3.5). 합쳐진 사진은 내 표시만 빠지고 마지막 사람이 지우면 삭제
  http.post('/api/bunches/:bunchId/photos/delete', async ({ params, request }) => {
    const bunchId = toWireId(params.bunchId);
    const body: unknown = await request.json().catch(() => null);
    const photoIds = (body as { photoIds?: unknown } | null)?.photoIds;
    if (bunchId === undefined || !isPhotoIdList(photoIds)) return fail(400, 'COMMON_001');

    const { memberships, photos } = mockDb.get();
    const myRole = memberships.find(
      (membership) => membership.bunchId === bunchId && membership.memberId === MOCK_MY_MEMBER_ID,
    )?.role;
    if (!myRole) return fail(403, 'AUTH_002');

    const targets = photos.filter(
      (photo) => photo.bunchId === bunchId && photoIds.includes(photo.photoId),
    );
    if (targets.length !== new Set(photoIds).size) return fail(404, 'RESOURCE_001');
    // ponytail: 남의 사진을 지우려는 멤버의 오류 코드는 명세에 없어 AUTH_002로 대신함, 명세 확정 시 교체
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
