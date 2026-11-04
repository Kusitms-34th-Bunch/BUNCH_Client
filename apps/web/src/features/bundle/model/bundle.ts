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
  caption: z.string(),
  captionVersion: z.number().int().nonnegative(),
  captionUpdatedBy: z.number().int().positive().nullish(),
  captionUpdatedAt: z.string().nullish(),
}) satisfies z.ZodType<ApiContract<Schemas['BundlePhotoResponse']>>;

const bundleParticipantSchema = z.object({
  memberId: z.number().int().positive(),
  joinedAt: z.string(),
}) satisfies z.ZodType<ApiContract<Schemas['BundleParticipantResponse']>>;

const bundleCommentSchema = z.object({
  memberId: z.number().int().positive(),
  content: z.string(),
  version: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
}) satisfies z.ZodType<ApiContract<Schemas['BundleCommentResponse']>>;

const bundlePermissionsSchema = z.object({
  administrator: z.boolean(),
  creator: z.boolean(),
  participant: z.boolean(),
  canEdit: z.boolean(),
  canPublish: z.boolean(),
  canDelete: z.boolean(),
}) satisfies z.ZodType<ApiContract<Schemas['BundlePermissions']>>;

const leaseStateSchema = z.object({
  target: z.string(),
  memberId: z.number().int().positive(),
  expiresAt: z.string(),
  leaseVersion: z.number().int().nonnegative(),
}) satisfies z.ZodType<ApiContract<Schemas['LeaseState']>>;

/** BundleSnapshot(초안 생성·상세·저장·발행 응답 공통), 중첩 배열·객체는 계약 검사가 선택 필드를 다루지 못해 위 항목별 스키마에서 따로 결합 */
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
  revision: z.number().int().nonnegative(),
  photos: z.array(bundlePhotoSchema),
  participants: z.array(bundleParticipantSchema),
  comments: z.array(bundleCommentSchema),
  dateChips: z.array(z.string()),
  publishBlockers: z.array(z.string()),
  permissions: bundlePermissionsSchema,
  leases: z.array(leaseStateSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().nullish(),
}) satisfies z.ZodType<
  Omit<
    ApiContract<Schemas['BundleSnapshot']>,
    'photos' | 'participants' | 'comments' | 'permissions' | 'leases'
  > & {
    photos: unknown;
    participants: unknown;
    comments: unknown;
    permissions: unknown;
    leases: unknown;
  }
>;

/** 발행 차단 사유(BUNDLE_005 detail.reasons와 같은 값) */
export type PublishBlockerReason =
  | 'TITLE_REQUIRED'
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
  /** 내용이 바뀔 때마다 오르는 버전, 발행 요청의 expectedRevision */
  revision: number;
  /** 번들 사진(순서대로), id는 번들 사진 ID이고 sourcePhotoId가 사진함 원본 */
  photos: readonly {
    id: string;
    sourcePhotoId: string | undefined;
    src: string;
    position: number;
    addedBy: string;
    caption: string;
    captionVersion: number;
  }[];
  /** 참여 멤버 id(참여 시각 순) */
  participantIds: readonly string[];
  comments: readonly { memberId: string; content: string; version: number }[];
  /** 날짜를 고르기 전의 추천 촬영일(최대 3개) */
  dateChips: readonly string[];
  publishBlockers: readonly string[];
  permissions: z.infer<typeof bundlePermissionsSchema>;
  /** 누가 어느 대상을 편집 중인지(token은 서버가 공개하지 않음) */
  leases: readonly { target: string; memberId: string; leaseVersion: number; expiresAt: string }[];
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
  revision: snapshot.revision,
  photos: [...snapshot.photos]
    .sort((a, b) => a.position - b.position)
    .map((photo) => ({
      id: toDomainId(photo.id),
      sourcePhotoId: photo.photoId == null ? undefined : toDomainId(photo.photoId),
      src: photo.imageUrl,
      position: photo.position,
      addedBy: toDomainId(photo.addedBy),
      caption: photo.caption,
      captionVersion: photo.captionVersion,
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
  leases: snapshot.leases.map((lease) => ({
    target: lease.target,
    memberId: toDomainId(lease.memberId),
    leaseVersion: lease.leaseVersion,
    expiresAt: lease.expiresAt,
  })),
});

/** 편집권 획득·갱신 응답(LEASE_GRANTED·LEASE_HEARTBEAT의 data) */
export const leaseGrantSchema = z.object({
  target: z.string(),
  token: z.uuid(),
  leaseVersion: z.number().int().nonnegative(),
  expiresAt: z.string(),
});

export type LeaseGrant = z.infer<typeof leaseGrantSchema>;
