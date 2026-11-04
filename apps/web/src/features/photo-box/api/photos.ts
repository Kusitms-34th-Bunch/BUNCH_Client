import type { components } from '@app/api-core/generated';
import { ApiError } from '@app/api-core';
import { bffApi, requestData } from '@/shared/api/bffApi';
import { toWireId } from '@/shared/api/ids';
import { photoDeleteResponseSchema } from '../model/photos';

/**
 * 고른 사진 삭제. 멤버는 내가 올린 사진만, 관리자는 모든 사진(docs/specs/photo-box.md 3.3.5)
 * 오류 코드는 서버 확인 전이라 가짜 서버 기준(사라진 사진 RESOURCE_001, 권한 밖 AUTH_002)
 */
export const removePhotos = async (bunchId: string, photoIds: readonly string[]) => {
  const wireIds = photoIds.map(toWireId);
  // 화면 id가 서버 숫자로 바뀌지 않으면 요청 전에 막음(잘못된 id를 서버에 보내지 않음)
  if (!wireIds.every((id) => id !== undefined)) {
    throw new ApiError({ category: 'validation', message: 'invalid photo id' });
  }
  return requestData(
    bffApi.post(`bunches/${encodeURIComponent(bunchId)}/photos/delete`, {
      json: { photoIds: wireIds } satisfies components['schemas']['PhotoDeleteRequest'],
    }),
    photoDeleteResponseSchema,
    'delete photos',
  );
};
