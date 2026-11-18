import type { ApiContract } from '@app/api-core';
import type { components } from '@app/api-core/generated';
import { z } from 'zod';
import { toDomainId } from '@/shared/api/ids';
import { isSafeImageUrl } from '@/shared/lib/safeImageUrl';

type Schemas = components['schemas'];

const bundleParticipantSchema = z.object({
  memberId: z.number().int().positive(),
  joinedAt: z.string(),
  nickname: z.string().nullish(),
  imageUrl: z.string().nullish(),
  profileAvailable: z.boolean(),
  role: z.enum(['OWNER', 'CO_OWNER', 'MEMBER']).nullish(),
  creator: z.boolean(),
}) satisfies z.ZodType<ApiContract<Schemas['BundleParticipantResponse']>>;

/** 사진 하나의 픽 요약(내 기준). version은 내 본인 픽의 버전이고 PUT 픽 저장의 expectedVersion */
export const bundlePhotoPicksSchema = z.object({
  count: z.number().int().nonnegative(),
  pickedByMe: z.boolean(),
  version: z.number().int().nonnegative(),
  members: z.array(bundleParticipantSchema),
  // members는 항목별 스키마(참여자)에서 검사하므로 계약 대조에서 제외(아래 BundleSnapshot과 같은 이유)
}) satisfies z.ZodType<
  Omit<ApiContract<Schemas['BundlePhotoPicks']>, 'members'> & { members: unknown }
>;

const bundlePhotoSchema = z.object({
  id: z.number().int().positive(),
  photoId: z.number().int().positive().nullish(),
  imageAssetId: z.number().int().positive(),
  imageUrl: z.string().refine(isSafeImageUrl, 'https 주소 또는 같은 출처 경로만 허용'),
  position: z.number().int().nonnegative(),
  addedBy: z.number().int().positive(),
  addedAt: z.string(),
  picks: bundlePhotoPicksSchema.nullish(),
}) satisfies z.ZodType<
  Omit<ApiContract<Schemas['BundlePhotoResponse']>, 'picks'> & { picks?: unknown }
>;

const bundleLocationSchema = z.object({
  id: z.number().int().positive(),
  provider: z.string(),
  externalId: z.string(),
  name: z.string(),
  address: z.string().nullish(),
  position: z.number().int().nonnegative(),
}) satisfies z.ZodType<ApiContract<Schemas['BundleLocationResponse']>>;

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

/**
 * 초안의 금칙어 검사 상태(서버가 자동 저장 때 검사해 스냅샷·제목 병합 응답·TITLE/COMMENT/PARTICIPANTS 이벤트에 함께 줌)
 * 발행본은 소급 검사하지 않아 null. 현재 참여자의 코멘트만 담김(기능명세 4.3.3 로직 5·4.3.8 로직 1)
 */
export const bundleProfanitySchema = z.object({
  dictionaryVersion: z.string(),
  titleHasProhibitedWord: z.boolean(),
  comments: z.array(
    z.object({ memberId: z.number().int().positive(), hasProhibitedWord: z.boolean() }),
  ),
}) satisfies z.ZodType<ApiContract<Schemas['BundleProfanityState']>>;

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
 * 아래 `satisfies`는 `photos`·`locations` 등 중첩 항목은 제외(항목별 스키마가 검사, 주소는 서버가 null을 줄 수 있음)
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
  publishedBy: z.number().int().positive().nullish(),
  publisherNickname: z.string().nullish(),
  profanity: bundleProfanitySchema.nullish(),
}) satisfies z.ZodType<
  Omit<
    ApiContract<Schemas['BundleSnapshot']>,
    'photos' | 'participants' | 'comments' | 'permissions' | 'locations'
  > & {
    locations: unknown;
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
  | 'TITLE_PROHIBITED_WORD'
  | 'VISIBILITY_REQUIRED'
  | 'PARTICIPANTS_REQUIRED'
  | 'PARTICIPANT_INACTIVE'
  | 'COMMENTS_REQUIRED'
  | 'COMMENTS_PROHIBITED_WORD'
  | 'PHOTOS_REQUIRED';

/** 번들 장소 작업 적용(`locations/intents`) 응답: 최신 장소 목록과 버전 */
export const bundleLocationIntentResultSchema = z.object({
  bundleId: z.number().int().positive(),
  revision: z.number().int().nonnegative(),
  locationVersion: z.number().int().nonnegative(),
  changed: z.boolean(),
  acceptedCount: z.number().int().nonnegative(),
  locations: z.array(bundleLocationSchema),
  // 장소 항목은 항목별 스키마가 검사하므로 계약 대조에서 제외(아래 BundleSnapshot과 같은 이유)
}) satisfies z.ZodType<
  Omit<ApiContract<Schemas['BundleLocationIntentResponse']>, 'locations'> & { locations: unknown }
>;

/** 제목 CRDT 병합 응답(BundleSnapshot이 아니라 제목 상태만, 번들 revision은 없음) */
export const bundleTitleStateSchema = z.object({
  title: z.string(),
  titleCrdtState: z.string(),
  titleVersion: z.number().int().nonnegative(),
  titleTooLong: z.boolean(),
  profanity: bundleProfanitySchema,
  publishBlockers: z.array(z.string()),
}) satisfies z.ZodType<ApiContract<Schemas['BundleTitleState']>>;

export type BundleTitleState = z.infer<typeof bundleTitleStateSchema>;

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
  /** 서버에 저장된 장소(position 순서) */
  locations: readonly DetailLocation[];
  /** 장소 목록의 서버 버전(낡은 `LOCATION` 이벤트·저장 응답을 가르는 기준) */
  locationVersion: number;
  /** 내용이 바뀔 때마다 오르는 버전, 발행 요청의 expectedRevision */
  revision: number;
  /** 번들 사진(순서대로), id는 번들 사진 ID이고 sourcePhotoId가 사진함 원본 */
  photos: readonly {
    id: string;
    sourcePhotoId: string | undefined;
    src: string;
    position: number;
    addedBy: string;
    /** 픽 요약. 응답에 없으면 undefined(픽 없음으로 다룸) */
    picks: PhotoPicks | undefined;
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
  /** 초안의 금칙어 검사 결과(발행본·서버가 주지 않으면 undefined) */
  profanity: BundleProfanity | undefined;
  /** 제목 CRDT 문서(Automerge 전체 저장 문서의 base64). 발행본에는 없음 */
  titleCrdtState: string | undefined;
  /** 발행본의 발행자 닉네임(초안에는 없음) */
  publisherNickname: string | undefined;
  /** 사진 구성 변경 응답에만 있음. 정원 초과로 못 담은 사진과 같은 키 재시도 여부 */
  photoChangeResult: PhotoChangeResult | undefined;
};

/** 사진 하나의 픽: 내 본인 픽 버전(PUT의 expectedVersion), 내가 픽했는지, 픽한 참여 멤버 id(참여 시각 순) */
export type PhotoPicks = {
  version: number;
  pickedByMe: boolean;
  memberIds: readonly string[];
};

/** 번들 장소 한 줄: id는 서버 장소 행 id */
export type DetailLocation = {
  id: string;
  provider: string;
  externalId: string;
  name: string;
  address: string | null;
};

export type PhotoChangeResult = {
  /** 담긴 사진함 원본 ID */
  addedPhotoIds: readonly string[];
  /** 정원 초과로 담기지 못한 사진함 원본 ID(사진함에는 남음) */
  rejectedPhotoIds: readonly string[];
  /** 같은 멱등 키의 재시도라 처음 결과를 다시 돌려줌 */
  replayed: boolean;
};

type SnapshotPhoto = z.infer<typeof bundlePhotoSchema>;
type SnapshotPicks = z.infer<typeof bundlePhotoPicksSchema>;
type SnapshotLocation = z.infer<typeof bundleLocationSchema>;
type SnapshotParticipant = z.infer<typeof bundleParticipantSchema>;
type SnapshotComment = z.infer<typeof bundleCommentSchema>;

/** 서버 픽 요약을 화면 모양으로 변환 */
export const toPhotoPicks = (picks: SnapshotPicks): PhotoPicks => ({
  version: picks.version,
  pickedByMe: picks.pickedByMe,
  memberIds: toParticipantIds(picks.members),
});

/** 번들 사진을 화면 모양으로 변환(position 순서) */
export const toDetailPhotos = (photos: readonly SnapshotPhoto[]): BundleDetail['photos'] =>
  [...photos]
    .sort((a, b) => a.position - b.position)
    .map((photo) => ({
      id: toDomainId(photo.id),
      sourcePhotoId: photo.photoId == null ? undefined : toDomainId(photo.photoId),
      src: photo.imageUrl,
      position: photo.position,
      addedBy: toDomainId(photo.addedBy),
      picks: photo.picks == null ? undefined : toPhotoPicks(photo.picks),
    }));

export const toDetailLocations = (
  locations: readonly SnapshotLocation[],
): BundleDetail['locations'] =>
  [...locations]
    .sort((a, b) => a.position - b.position)
    .map((location) => ({
      id: toDomainId(location.id),
      provider: location.provider,
      externalId: location.externalId,
      name: location.name,
      address: location.address ?? null,
    }));

/** 참여 멤버 id(참여 시각 순) */
export const toParticipantIds = (participants: readonly SnapshotParticipant[]): string[] =>
  [...participants]
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))
    .map((participant) => toDomainId(participant.memberId));

/** 금칙어 검사 상태: 제목에 있는지, 금칙어가 있는 코멘트를 쓴 멤버 id */
export type BundleProfanity = {
  titleProhibited: boolean;
  prohibitedCommentMemberIds: readonly string[];
};

export const toBundleProfanity = (
  profanity: z.infer<typeof bundleProfanitySchema> | null | undefined,
): BundleProfanity | undefined =>
  profanity
    ? {
        titleProhibited: profanity.titleHasProhibitedWord,
        prohibitedCommentMemberIds: profanity.comments
          .filter((comment) => comment.hasProhibitedWord)
          .map((comment) => toDomainId(comment.memberId)),
      }
    : undefined;

export const toDetailComment = (comment: SnapshotComment): BundleDetail['comments'][number] => ({
  memberId: toDomainId(comment.memberId),
  content: comment.content,
  version: comment.version,
});

/** 장소 작업 응답을 화면 계층이 쓰는 모양으로 변환 */
export const toLocationIntentResult = (
  result: z.infer<typeof bundleLocationIntentResultSchema>,
): { locations: BundleDetail['locations']; locationVersion: number; changed: boolean } => ({
  locations: toDetailLocations(result.locations),
  locationVersion: result.locationVersion,
  changed: result.changed,
});

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
  locations: toDetailLocations(snapshot.locations),
  locationVersion: snapshot.locationVersion,
  revision: snapshot.revision,
  photos: toDetailPhotos(snapshot.photos),
  participantIds: toParticipantIds(snapshot.participants),
  comments: snapshot.comments.map(toDetailComment),
  dateChips: snapshot.dateChips,
  publishBlockers: snapshot.publishBlockers,
  permissions: snapshot.permissions,
  titleTooLong: snapshot.titleTooLong,
  profanity: toBundleProfanity(snapshot.profanity),
  titleCrdtState: snapshot.titleCrdtState ?? undefined,
  publisherNickname: snapshot.publisherNickname ?? undefined,
  photoChangeResult: snapshot.photoChangeResult
    ? {
        addedPhotoIds: snapshot.photoChangeResult.addedPhotoIds.map(toDomainId),
        rejectedPhotoIds: snapshot.photoChangeResult.rejectedPhotoIds.map(toDomainId),
        replayed: snapshot.photoChangeResult.replayed,
      }
    : undefined,
});

/**
 * 번들 topic 이벤트의 공통 봉투(v5): type으로 분기하고, revision은 내용 이벤트에만 있음
 * data는 type별 스키마(아래)로 다시 검사
 */
export const bundleEventEnvelopeSchema = z.object({
  type: z.string(),
  revision: z.number().int().nonnegative().nullish(),
  data: z.unknown(),
});

const versionSchema = z.number().int().nonnegative();

/** 내용 이벤트 type별 data. 모양이 다르면 이벤트로 적용하지 않고 최신 상세를 다시 받음 */
const profanityEventFields = {
  profanity: bundleProfanitySchema.nullish(),
  publishBlockers: z.array(z.string()).nullish(),
};

export const bundleEventDataSchemas = {
  DATE: z.object({
    value: z.string().nullable(),
    version: versionSchema,
    dateChips: z.array(z.string()),
  }),
  VISIBILITY: z.object({
    value: z.enum(['PUBLIC', 'PRIVATE']).nullable(),
    version: versionSchema,
  }),
  LOCATION: z.object({ locations: z.array(bundleLocationSchema), version: versionSchema }),
  PHOTOS: z.object({ photos: z.array(bundlePhotoSchema), dateChips: z.array(z.string()) }),
  // 금칙어 상태와 발행 차단 사유는 기존 필드에 더해 오는 값(없는 이벤트도 받음)
  COMMENT: bundleCommentSchema.extend(profanityEventFields),
  PARTICIPANTS: z.object({
    participants: z.array(bundleParticipantSchema),
    comments: z.array(bundleCommentSchema),
    removedCommentMemberIds: z.array(z.number().int().positive()).nullish(),
    ...profanityEventFields,
  }),
  TITLE: z.object({
    title: z.string(),
    titleVersion: versionSchema,
    titleCrdtState: z.string(),
    titleTooLong: z.boolean(),
    ...profanityEventFields,
  }),
  /** 별도 갱신(내용 revision을 올리지 않음): 배열 그대로이거나 `{ dateChips }` */
  DATE_CHIPS: z.union([
    z.array(z.string()),
    z.object({ dateChips: z.array(z.string()) }).transform((data) => data.dateChips),
  ]),
} as const;

/** revision 규칙으로 적용하는 내용 이벤트 type(DATE_CHIPS와 CREATED·PUBLISHED·EDITED는 따로 처리) */
export const CONTENT_EVENT_TYPES = [
  'DATE',
  'VISIBILITY',
  'LOCATION',
  'PHOTOS',
  'COMMENT',
  'PARTICIPANTS',
  'TITLE',
] as const;
