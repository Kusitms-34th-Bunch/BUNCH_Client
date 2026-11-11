import type { ApiContract } from '@app/api-core';
import type { components } from '@app/api-core/generated';
import { z } from 'zod';
import { toDomainId } from '@/shared/api/ids';
import { isSafeImageUrl } from '@/shared/lib/safeImageUrl';
import type { PhotoBoxPhoto } from '../lib/types';

/**
 * `POST /api/v1/bunches/{bunchId}/photos/delete` 응답
 * 사라진 사진 수와 함께 올린 사진에서 내 표시만 빠진 수(docs/specs/photo-box.md 데이터 표 기준 해석, 서버 확인 전)
 */
export const photoDeleteResponseSchema = z.object({
  deletedCount: z.number().int().nonnegative(),
  uploaderRemovedCount: z.number().int().nonnegative(),
}) satisfies z.ZodType<ApiContract<components['schemas']['PhotoDeleteResponse']>>;

export type PhotoDeleteResult = z.infer<typeof photoDeleteResponseSchema>;

/**
 * `POST /api/v1/bunches/{bunchId}/photos` 응답. `STORED`는 새로 저장, `MERGED`는 다른 멤버가 올린 같은 사진에 올린 사람으로 추가,
 * `ALREADY_UPLOADED`는 내가 이미 올린 같은 사진(변경 없음). 세 경우 모두 사진 id를 돌려줌
 */
export const photoUploadResponseSchema = z.object({
  photoId: z.number().int().positive(),
  result: z.enum(['STORED', 'MERGED', 'ALREADY_UPLOADED']),
}) satisfies z.ZodType<ApiContract<components['schemas']['PhotoUploadResponse']>>;

// 서버 확인 전: Swagger는 시각을 객체(LocalTime), 명세 문서는 'HH:mm:ss' 문자열로 적어 둘 다 받음
const capturedTimeSchema = z.union([
  z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d+)?)?$/),
  z.object({
    hour: z.number().int().min(0).max(23).optional(),
    minute: z.number().int().min(0).max(59).optional(),
    second: z.number().int().min(0).max(59).optional(),
    nano: z.number().int().optional(),
  }),
]);

const uploaderIdsSchema = z.array(z.number().int().positive());

const datedPhotoSchema = z.object({
  photoId: z.number().int().positive(),
  thumbnailUrl: z.string(),
  capturedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  capturedTime: capturedTimeSchema.nullish(),
  uploaderIds: uploaderIdsSchema,
}) satisfies z.ZodType<
  Omit<ApiContract<components['schemas']['PhotoListItem']>, 'capturedTime'> & {
    capturedTime?: unknown;
  }
>;

const undatedPhotoSchema = z.object({
  photoId: z.number().int().positive(),
  thumbnailUrl: z.string(),
  uploaderIds: uploaderIdsSchema,
}) satisfies z.ZodType<ApiContract<components['schemas']['PhotoUndatedItem']>>;

/** `GET /api/v1/bunches/{bunchId}/photos` 응답(날짜를 아는 사진 한 페이지) */
export const datedPhotosPageSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  photos: z.array(datedPhotoSchema),
  nextCursor: z.string().nullish(),
}) satisfies z.ZodType<
  Omit<ApiContract<components['schemas']['PhotoListResponse']>, 'photos'> & { photos: unknown }
>;

/** `GET /api/v1/bunches/{bunchId}/photos/undated` 응답(날짜를 모르는 사진 한 페이지) */
export const undatedPhotosPageSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  photos: z.array(undatedPhotoSchema),
  nextCursor: z.string().nullish(),
}) satisfies z.ZodType<ApiContract<components['schemas']['PhotoUndatedResponse']>>;

const pad = (value: number | undefined) => String(value ?? 0).padStart(2, '0');

// 시각을 모르면 자정으로(같은 날짜 안에서 맨 아래)
const toHourMinute = (time: z.infer<typeof capturedTimeSchema> | null | undefined) => {
  if (typeof time === 'string') return time.slice(0, 5);
  return time ? `${pad(time.hour)}:${pad(time.minute)}` : '00:00';
};

// 서버가 업로드 시각을 주지 않아 id(오래된 순 발급)를 초로 바꿔 같은 촬영 시각의 정렬 기준으로 씀
// Date가 표현하는 최대 시각(8.64e15ms)을 넘는 id는 같은 값으로 묶어 변환 오류로 목록 전체가 실패하지 않게 함
const MAX_UPLOAD_ID = 8.64e12;
const toUploadedAt = (photoId: number) =>
  new Date(Math.min(photoId, MAX_UPLOAD_ID) * 1000).toISOString().slice(0, 19);

export const toDatedPhotoBoxPhoto = (photo: z.infer<typeof datedPhotoSchema>): PhotoBoxPhoto => ({
  id: toDomainId(photo.photoId),
  src: photo.thumbnailUrl,
  alt: `${photo.capturedDate}에 찍은 사진`,
  takenAt: `${photo.capturedDate}T${toHourMinute(photo.capturedTime)}`,
  uploadedAt: toUploadedAt(photo.photoId),
  uploaderIds: photo.uploaderIds.map(toDomainId),
  status: 'ready',
});

export const toUndatedPhotoBoxPhoto = (
  photo: z.infer<typeof undatedPhotoSchema>,
): PhotoBoxPhoto => ({
  id: toDomainId(photo.photoId),
  src: photo.thumbnailUrl,
  alt: '촬영 날짜를 모르는 사진',
  takenAt: null,
  uploadedAt: toUploadedAt(photo.photoId),
  uploaderIds: photo.uploaderIds.map(toDomainId),
  status: 'ready',
});

const photoDetailUploaderSchema = z.object({
  memberId: z.number().int().positive(),
  nickname: z.string().nullish(),
  imageUrl: z.string().nullish(),
}) satisfies z.ZodType<ApiContract<components['schemas']['PhotoDetailUploader']>>;

/** `GET /api/v1/bunches/{bunchId}/photos/{photoId}` 응답. 크게 보기는 원본 이미지 주소만 씀 */
export const photoDetailSchema = z.object({
  photoId: z.number().int().positive(),
  imageUrl: z.string().refine(isSafeImageUrl, 'https 주소 또는 같은 출처 경로만 허용'),
  capturedDate: z.string().nullish(),
  uploaders: z.array(photoDetailUploaderSchema),
}) satisfies z.ZodType<
  // 중첩 배열은 계약 검사가 선택 필드를 다루지 못해 uploaders는 위 스키마에서 따로 검사
  Omit<ApiContract<components['schemas']['PhotoDetailResponse']>, 'uploaders'> & {
    uploaders: unknown;
  }
>;
