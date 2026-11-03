import { http } from 'msw';
import { toWireId } from '@/shared/api/ids';
import { mockDb } from '../db';
import { MOCK_MY_MEMBER_ID } from '../db/seed';
import { fail, ok } from '../lib/envelope';

const isPhotoIdList = (value: unknown): value is number[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((id) => typeof id === 'number' && Number.isSafeInteger(id) && id > 0);

export const photoHandlers = [
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
];
