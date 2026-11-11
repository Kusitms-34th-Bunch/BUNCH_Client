import type { components } from '@app/api-core/generated';
import { ApiError, normalizeError } from '@app/api-core';
import { bffApi, requestData } from '@/shared/api/bffApi';
import { toDomainId, toWireId } from '@/shared/api/ids';
import { toMissingPhotosError } from '../lib/missingPhotos';
import {
  datedPhotosPageSchema,
  photoDateChangeResponseSchema,
  photoDeleteResponseSchema,
  photoDetailSchema,
  toDatedPhotoBoxPhoto,
  toUndatedPhotoBoxPhoto,
  undatedPhotosPageSchema,
} from '../model/photos';

/**
 * 고른 사진 삭제. 멤버는 내가 올린 사진만, 관리자는 모든 사진(docs/specs/photo-box.md 3.3.5)
 * 고른 사진 중 일부가 그사이 지워졌으면 아무것도 삭제하지 않고 `MissingPhotosError`(409 `PHOTO_004`, `detail.missingPhotoIds`)를 던짐
 * 그 밖의 오류: 권한 밖·번치 멤버 아님 `AUTH_002`, 잘못된 요청 `COMMON_001`
 */
export const removePhotos = async (bunchId: string, photoIds: readonly string[]) => {
  const wireIds = photoIds.map(toWireId);
  // 화면 id가 서버 숫자로 바뀌지 않으면 요청 전에 막음(잘못된 id를 서버에 보내지 않음)
  if (!wireIds.every((id) => id !== undefined)) {
    throw new ApiError({ category: 'validation', message: 'invalid photo id' });
  }
  try {
    return await requestData(
      bffApi.post(`bunches/${encodeURIComponent(bunchId)}/photos/delete`, {
        json: { photoIds: wireIds } satisfies components['schemas']['PhotoDeleteRequest'],
      }),
      photoDeleteResponseSchema,
      'delete photos',
    );
  } catch (error) {
    throw toMissingPhotosError(normalizeError(error));
  }
};

// 기기 시간대의 그날을 'yyyy-MM-dd'로 바꿈(서버는 날짜만 받고 오늘(Asia/Seoul) 이후면 400)
// 날짜 시트가 기기의 오늘까지만 고르게 하므로, 서울보다 시간대가 앞선 기기에서 서울 기준 내일을 고르면 서버가 거절할 수 있음(일반 실패 토스트)
const toDateText = (date: Date) =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, '0'))
    .join('-');

/**
 * 고른 사진(1~50장)의 촬영 날짜를 그날로 바꿈(시각은 유지, 서버가 날짜 출처를 사용자 지정으로 바꿈). 한 요청이 전부 성공 또는 전부 실패
 * 고른 사진 중 일부가 그사이 지워졌으면 `MissingPhotosError`(409 `PHOTO_004`)를 던짐
 * 그 밖의 오류: 오늘 이후 날짜·잘못된 요청 `COMMON_001`, 남의 사진을 섞은 일반 멤버·번치 멤버 아님 `AUTH_002`
 * 날짜 없음으로 되돌리는 `clearDate`는 날짜 미확인 사진을 끌 수 없어 호출하는 화면이 없으므로 연결하지 않음
 */
export const changePhotoDates = async (
  bunchId: string,
  photoIds: readonly string[],
  date: Date,
) => {
  const wireIds = photoIds.map(toWireId);
  if (!wireIds.every((id) => id !== undefined)) {
    throw new ApiError({ category: 'validation', message: 'invalid photo id' });
  }
  try {
    return await requestData(
      bffApi.post(`bunches/${encodeURIComponent(bunchId)}/photos/date`, {
        json: {
          photoIds: wireIds,
          capturedDate: toDateText(date),
        } satisfies Omit<components['schemas']['PhotoDateChangeRequest'], 'clearDate'>,
      }),
      photoDateChangeResponseSchema,
      'change photo dates',
    );
  } catch (error) {
    throw toMissingPhotosError(normalizeError(error));
  }
};

/** 한 번에 받을 사진 수. 서버 허용 범위(1~100)의 최댓값이라 사진함 상한(1,000장)을 10번에 받음 */
export const PHOTO_PAGE_SIZE = 100;

type PhotoPageParams = {
  bunchId: string;
  /** 올린 사람 필터(없으면 전체) */
  memberId?: string | undefined;
  cursor?: string | undefined;
  signal?: AbortSignal | undefined;
};

const toSearchParams = ({ memberId, cursor }: PhotoPageParams) => {
  const searchParams: Record<string, string> = { size: String(PHOTO_PAGE_SIZE) };
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
    // 빈 문자열도 마지막 쪽(끝)으로 봄: cursor를 보내지 않으면 첫 쪽을 다시 받게 되므로
    nextCursor: page.nextCursor || null,
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
    // 빈 문자열도 마지막 쪽(끝)으로 봄: cursor를 보내지 않으면 첫 쪽을 다시 받게 되므로
    nextCursor: page.nextCursor || null,
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
