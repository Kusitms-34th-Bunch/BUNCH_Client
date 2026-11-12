import { ApiError } from '@app/api-core';
import { toDomainId } from '@/shared/api/ids';

/**
 * 고른 사진 중 일부가 그사이 지워져 서버가 아무것도 바꾸지 않고 거절한 오류(`409 PHOTO_004`)
 * 삭제·날짜 바꾸기가 같은 오류를 돌려주며, 화면은 `missingIds`를 선택에서 빼고 안내함
 */
export class MissingPhotosError extends Error {
  readonly missingIds: readonly string[];

  constructor(missingIds: readonly string[]) {
    super('selected photos are gone');
    this.name = 'MissingPhotosError';
    this.missingIds = missingIds;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

// 응답 본문 `error.detail.missingPhotoIds`(요청에 담은 순서대로 사라진 사진 ID)를 화면 id로 바꿔 읽음. 형식이 다르면 빈 목록
const readMissingIds = (data: unknown): string[] => {
  const detail = isRecord(data) && isRecord(data.error) ? data.error.detail : undefined;
  const ids = isRecord(detail) ? detail.missingPhotoIds : undefined;
  if (!Array.isArray(ids)) return [];
  return ids.flatMap((id) => (typeof id === 'number' ? [toDomainId(id)] : []));
};

/** `PHOTO_004`면 `MissingPhotosError`로, 아니면 받은 오류 그대로 돌려줌 */
export const toMissingPhotosError = (error: unknown): unknown =>
  error instanceof ApiError && error.status === 409 && error.code === 'PHOTO_004'
    ? new MissingPhotosError(readMissingIds(error.data))
    : error;
