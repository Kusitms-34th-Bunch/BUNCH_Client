import type { components } from '@app/api-core/generated';
import { ApiError } from '@app/api-core';
import { bffApi, requestData } from '@/shared/api/bffApi';
import { toDomainId, toWireId } from '@/shared/api/ids';
import {
  datedPhotosPageSchema,
  photoDeleteResponseSchema,
  photoDetailSchema,
  toDatedPhotoBoxPhoto,
  toUndatedPhotoBoxPhoto,
  undatedPhotosPageSchema,
} from '../model/photos';

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

type PhotoPageParams = {
  bunchId: string;
  /** 올린 사람 필터(없으면 전체) */
  memberId?: string | undefined;
  cursor?: string | undefined;
  signal?: AbortSignal | undefined;
};

const toSearchParams = ({ memberId, cursor }: PhotoPageParams) => {
  const searchParams: Record<string, string> = {};
  if (memberId) searchParams.memberId = memberId;
  if (cursor) searchParams.cursor = cursor;
  return searchParams;
};

/** 날짜를 아는 사진 한 페이지(최신순, 서버 기본 60장) */
export const getDatedPhotosPage = async (params: PhotoPageParams) => {
  const page = await requestData(
    bffApi.get(`bunches/${encodeURIComponent(params.bunchId)}/photos`, {
      searchParams: toSearchParams(params),
      signal: params.signal ?? null,
    }),
    datedPhotosPageSchema,
    'dated photos',
  );
  return {
    totalCount: page.totalCount,
    photos: page.photos.map(toDatedPhotoBoxPhoto),
    nextCursor: page.nextCursor ?? null,
  };
};

/** 날짜를 모르는 사진 한 페이지 */
export const getUndatedPhotosPage = async (params: PhotoPageParams) => {
  const page = await requestData(
    bffApi.get(`bunches/${encodeURIComponent(params.bunchId)}/photos/undated`, {
      searchParams: toSearchParams(params),
      signal: params.signal ?? null,
    }),
    undatedPhotosPageSchema,
    'undated photos',
  );
  return {
    totalCount: page.totalCount,
    photos: page.photos.map(toUndatedPhotoBoxPhoto),
    nextCursor: page.nextCursor ?? null,
  };
};

/** 사진 한 장의 원본 이미지 주소(크게 보기용). 없는 사진은 RESOURCE_001 */
export const getPhotoDetail = async (bunchId: string, photoId: string, signal?: AbortSignal) => {
  const detail = await requestData(
    bffApi.get(`bunches/${encodeURIComponent(bunchId)}/photos/${encodeURIComponent(photoId)}`, {
      signal: signal ?? null,
    }),
    photoDetailSchema,
    'photo detail',
  );
  return { id: toDomainId(detail.photoId), imageSrc: detail.imageUrl };
};
