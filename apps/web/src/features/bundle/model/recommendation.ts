import type { ApiContract } from '@app/api-core';
import type { components } from '@app/api-core/generated';
import { z } from 'zod';
import type { PhotoBoxMember, PhotoBoxPhoto } from '@/features/photo-box/lib/types';
import { toDomainId } from '@/shared/api/ids';
import { isSafeImageUrl } from '@/shared/lib/safeImageUrl';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const imageUrlSchema = z.string().refine(isSafeImageUrl);

const uploaderSchema = z.object({
  memberId: z.number().int().positive(),
  nickname: z.string().nullish(),
  imageUrl: z.string().nullish(),
}) satisfies z.ZodType<ApiContract<components['schemas']['RecommendedUploader']>>;

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

const cardSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  startDate: dateSchema,
  endDate: dateSchema.nullish(),
  photoCount: z.number().int().nonnegative(),
  uploaders: z.array(uploaderSchema),
  coverImageUrl: imageUrlSchema,
}) satisfies z.ZodType<ApiContract<components['schemas']['RecommendedBundleCard']>>;

/** `GET /api/v1/bunches/{bunchId}/recommended-bundles` 응답 */
export const recommendationListSchema = z.object({
  bundles: z.array(cardSchema),
}) satisfies z.ZodType<ApiContract<components['schemas']['RecommendedBundleListResponse']>>;

const photoSchema = z.object({
  photoId: z.number().int().positive(),
  thumbnailUrl: imageUrlSchema,
  imageUrl: imageUrlSchema,
  capturedDate: dateSchema,
  capturedTime: capturedTimeSchema.nullish(),
  uploaders: z.array(uploaderSchema),
}) satisfies z.ZodType<
  Omit<ApiContract<components['schemas']['RecommendedBundlePhoto']>, 'capturedTime'> & {
    capturedTime?: unknown;
  }
>;

/** `GET /api/v1/bunches/{bunchId}/recommended-bundles/{id}` 응답 */
export const recommendationDetailSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  photos: z.array(photoSchema),
}) satisfies z.ZodType<
  Omit<ApiContract<components['schemas']['RecommendedBundleDetailResponse']>, 'photos'> & {
    photos: unknown;
  }
>;

/** 시트 카드에 보이는 추천 번들(제목은 서버가 정해 내려줌, 장소는 없음) */
export type Recommendation = {
  id: string;
  title: string;
  /** 대표 사진(카드 사진 중 첫 장) */
  imageSrc: string;
  /** 카드 사진을 올린 멤버 닉네임(많이 올린 순) */
  memberNames: readonly string[];
  photoCount: number;
  /** 시작 날짜 'YYYY-MM-DD' */
  startDate: string;
  /** 자정을 넘겨 이은 추천 번들의 끝 날짜. 아니면 null */
  endDate: string | null;
};

/** 상세·뷰어·적용에 쓰는 추천 번들: 적용될 순서대로의 사진과 올린 멤버 */
export type RecommendationDetail = {
  id: string;
  title: string;
  photos: readonly PhotoBoxPhoto[];
  /** 뷰어용 원본 비율 사진 주소(사진 id별). 그리드에 쓰는 사진 주소는 정사각 썸네일 */
  originalSrcById: Readonly<Record<string, string>>;
  /** 사진 배지에 쓰는 올린 멤버(사진마다 `uploaderIds`로 가리킴) */
  members: readonly PhotoBoxMember[];
};

// 닉네임이 없는 멤버는 칩에서 뺌(빈 칩을 만들지 않음)
export const toRecommendation = (card: z.infer<typeof cardSchema>): Recommendation => ({
  id: toDomainId(card.id),
  title: card.title,
  imageSrc: card.coverImageUrl,
  memberNames: card.uploaders.flatMap((uploader) => (uploader.nickname ? [uploader.nickname] : [])),
  photoCount: card.photoCount,
  startDate: card.startDate,
  endDate: card.endDate ?? null,
});

const pad = (value: number | undefined) => String(value ?? 0).padStart(2, '0');

// 시각을 모르면 자정으로(같은 날짜 안에서 맨 아래)
const toHourMinute = (time: z.infer<typeof capturedTimeSchema> | null | undefined) => {
  if (typeof time === 'string') return time.slice(0, 5);
  return time ? `${pad(time.hour)}:${pad(time.minute)}` : '00:00';
};

export const toRecommendationDetail = (
  detail: z.infer<typeof recommendationDetailSchema>,
): RecommendationDetail => {
  const members = new Map<string, PhotoBoxMember>();
  const originalSrcById: Record<string, string> = {};
  const photos = detail.photos.map((photo): PhotoBoxPhoto => {
    for (const uploader of photo.uploaders) {
      const id = toDomainId(uploader.memberId);
      if (!members.has(id)) {
        members.set(id, {
          id,
          name: uploader.nickname ?? '',
          ...(uploader.imageUrl && isSafeImageUrl(uploader.imageUrl)
            ? { avatarSrc: uploader.imageUrl }
            : {}),
        });
      }
    }
    originalSrcById[toDomainId(photo.photoId)] = photo.imageUrl;
    return {
      id: toDomainId(photo.photoId),
      src: photo.thumbnailUrl,
      alt: `${photo.capturedDate}에 찍은 사진`,
      takenAt: `${photo.capturedDate}T${toHourMinute(photo.capturedTime)}`,
      // 추천 순서가 곧 표시 순서라 업로드 시각은 쓰지 않음
      uploadedAt: `${photo.capturedDate}T00:00:00`,
      uploaderIds: photo.uploaders.map((uploader) => toDomainId(uploader.memberId)),
      status: 'ready',
    };
  });
  return {
    id: toDomainId(detail.id),
    title: detail.title,
    photos,
    originalSrcById,
    members: [...members.values()],
  };
};
