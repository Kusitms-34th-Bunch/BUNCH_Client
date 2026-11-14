import type { ApiContract } from '@app/api-core';
import type { components } from '@app/api-core/generated';
import { z } from 'zod';
import { toDomainId } from '@/shared/api/ids';
import { isSafeImageUrl } from '@/shared/lib/safeImageUrl';

type Schemas = components['schemas'];

const bundlePhotoSchema = z.object({
  id: z.number().int().positive(),
  photoId: z.number().int().positive().nullish(),
  imageAssetId: z.number().int().positive(),
  imageUrl: z.string().refine(isSafeImageUrl, 'https 주소 또는 같은 출처 경로만 허용'),
  position: z.number().int().nonnegative(),
  addedBy: z.number().int().positive(),
  addedAt: z.string(),
}) satisfies z.ZodType<ApiContract<Schemas['BundlePhotoResponse']>>;

const bundleLocationSchema = z.object({
  id: z.number().int().positive(),
  provider: z.string(),
  externalId: z.string(),
  name: z.string(),
  address: z.string(),
  position: z.number().int().nonnegative(),
}) satisfies z.ZodType<ApiContract<Schemas['BundleLocationResponse']>>;

const bundleParticipantSchema = z.object({
  memberId: z.number().int().positive(),
  joinedAt: z.string(),
  nickname: z.string().nullish(),
  imageUrl: z.string().nullish(),
  profileAvailable: z.boolean(),
  role: z.enum(['OWNER', 'CO_OWNER', 'MEMBER']).nullish(),
  creator: z.boolean(),
}) satisfies z.ZodType<ApiContract<Schemas['BundleParticipantResponse']>>;

const bundleCommentSchema = z.object({
  id: z.number().int().positive(),
  memberId: z.number().int().positive(),
  content: z.string(),
  version: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
  nickname: z.string().nullish(),
  imageUrl: z.string().nullish(),
  profileAvailable: z.boolean(),
}) satisfies z.ZodType<ApiContract<Schemas['BundleCommentResponse']>>;

const bundlePermissionsSchema = z.object({
  administrator: z.boolean(),
  creator: z.boolean(),
  participant: z.boolean(),
  canEdit: z.boolean(),
  canPublish: z.boolean(),
  canDelete: z.boolean(),
  canReport: z.boolean(),
  canLike: z.boolean(),
  canComment: z.boolean(),
}) satisfies z.ZodType<ApiContract<Schemas['BundlePermissions']>>;

/**
 * BundleSnapshot(초안 생성·상세·저장·발행 응답 공통)
 * 중첩 배열·객체는 계약 검사가 선택 필드를 다루지 못해 항목별 스키마(위)에서 따로 검사 후 결합
 * 아래 `satisfies`는 `locations`를 그대로 대조하고 `photos` 등 나머지 중첩 항목은 제외
 */
export const bundleSnapshotSchema = z.object({
  id: z.number().int().positive(),
  bunchId: z.number().int().positive(),
  createdBy: z.number().int().positive(),
  status: z.enum(['DRAFT', 'PUBLISHED']),
  title: z.string(),
  titleVersion: z.number().int().nonnegative(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).nullish(),
  visibilityVersion: z.number().int().nonnegative(),
  date: z.string().nullish(),
  dateVersion: z.number().int().nonnegative(),
  locationVersion: z.number().int().nonnegative(),
  locations: z.array(bundleLocationSchema),
  likeCount: z.number().int().nonnegative(),
  likedByCurrentBunch: z.boolean(),
  commentCount: z.number().int().nonnegative(),
  revision: z.number().int().nonnegative(),
  photos: z.array(bundlePhotoSchema),
  participants: z.array(bundleParticipantSchema),
  comments: z.array(bundleCommentSchema),
  dateChips: z.array(z.string()),
  publishBlockers: z.array(z.string()),
  permissions: bundlePermissionsSchema,
  titleTooLong: z.boolean(),
  titleCrdtState: z.string().nullish(),
  photoChangeResult: z
    .object({
      addedPhotoIds: z.array(z.number().int().positive()),
      rejectedPhotoIds: z.array(z.number().int().positive()),
      replayed: z.boolean(),
    })
    .nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().nullish(),
}) satisfies z.ZodType<
  Omit<
    ApiContract<Schemas['BundleSnapshot']>,
    'photos' | 'participants' | 'comments' | 'permissions'
  > & {
    photos: unknown;
    participants: unknown;
    comments: unknown;
    permissions: unknown;
  }
>;

/** 발행 차단 사유(BUNDLE_005 detail.reasons와 같은 값) */
export type PublishBlockerReason =
  | 'TITLE_REQUIRED'
  | 'TITLE_TOO_LONG'
  | 'VISIBILITY_REQUIRED'
  | 'PARTICIPANTS_REQUIRED'
  | 'PARTICIPANT_INACTIVE'
  | 'COMMENTS_REQUIRED'
  | 'PHOTOS_REQUIRED';

export type BundleDetail = {
  id: string;
  bunchId: string;
  createdBy: string;
  status: 'DRAFT' | 'PUBLISHED';
  title: string;
  titleVersion: number;
  visibility: 'PUBLIC' | 'PRIVATE' | null;
  visibilityVersion: number;
  /** 'YYYY-MM-DD', 고르지 않았으면 null */
  date: string | null;
  dateVersion: number;
  /** 서버에 저장된 장소(가짜 서버 확장, 없으면 빈 목록) */
  locations: readonly { id: string; name: string }[];
  /** 내용이 바뀔 때마다 오르는 버전, 발행 요청의 expectedRevision */
  revision: number;
  /** 번들 사진(순서대로), id는 번들 사진 ID이고 sourcePhotoId가 사진함 원본 */
  photos: readonly {
    id: string;
    sourcePhotoId: string | undefined;
    src: string;
    position: number;
    addedBy: string;
  }[];
  /** 참여 멤버 id(참여 시각 순) */
  participantIds: readonly string[];
  comments: readonly { memberId: string; content: string; version: number }[];
  /** 날짜를 고르기 전의 추천 촬영일(최대 3개) */
  dateChips: readonly string[];
  publishBlockers: readonly string[];
  permissions: z.infer<typeof bundlePermissionsSchema>;
  /** 병합된 제목이 40자를 넘음(자르지 않고 보존, 발행 불가 사유) */
  titleTooLong: boolean;
  /** 사진 구성 변경 응답에만 있음. 정원 초과로 못 담은 사진과 같은 키 재시도 여부 */
  photoChangeResult: PhotoChangeResult | undefined;
};

export type PhotoChangeResult = {
  /** 담긴 사진함 원본 ID */
  addedPhotoIds: readonly string[];
  /** 정원 초과로 담기지 못한 사진함 원본 ID(사진함에는 남음) */
  rejectedPhotoIds: readonly string[];
  /** 같은 멱등 키의 재시도라 처음 결과를 다시 돌려줌 */
  replayed: boolean;
};

/** 서버 응답을 화면 계층이 쓰는 모양으로 변환(문자열 id, 사진 순서 정렬) */
export const toBundleDetail = (snapshot: z.infer<typeof bundleSnapshotSchema>): BundleDetail => ({
  id: toDomainId(snapshot.id),
  bunchId: toDomainId(snapshot.bunchId),
  createdBy: toDomainId(snapshot.createdBy),
  status: snapshot.status,
  title: snapshot.title,
  titleVersion: snapshot.titleVersion,
  visibility: snapshot.visibility ?? null,
  visibilityVersion: snapshot.visibilityVersion,
  date: snapshot.date ?? null,
  dateVersion: snapshot.dateVersion,
  locations: snapshot.locations.map((location) => ({
    id: `${location.provider}:${location.externalId}`,
    name: location.name,
  })),
  revision: snapshot.revision,
  photos: [...snapshot.photos]
    .sort((a, b) => a.position - b.position)
    .map((photo) => ({
      id: toDomainId(photo.id),
      sourcePhotoId: photo.photoId == null ? undefined : toDomainId(photo.photoId),
      src: photo.imageUrl,
      position: photo.position,
      addedBy: toDomainId(photo.addedBy),
    })),
  participantIds: [...snapshot.participants]
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))
    .map((participant) => toDomainId(participant.memberId)),
  comments: snapshot.comments.map((comment) => ({
    memberId: toDomainId(comment.memberId),
    content: comment.content,
    version: comment.version,
  })),
  dateChips: snapshot.dateChips,
  publishBlockers: snapshot.publishBlockers,
  permissions: snapshot.permissions,
  titleTooLong: snapshot.titleTooLong,
  photoChangeResult: snapshot.photoChangeResult
    ? {
        addedPhotoIds: snapshot.photoChangeResult.addedPhotoIds.map(toDomainId),
        rejectedPhotoIds: snapshot.photoChangeResult.rejectedPhotoIds.map(toDomainId),
        replayed: snapshot.photoChangeResult.replayed,
      }
    : undefined,
});
