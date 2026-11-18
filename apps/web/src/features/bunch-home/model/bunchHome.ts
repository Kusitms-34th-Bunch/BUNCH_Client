import type { components } from '@app/api-core/generated';
import { type ApiContract, isApiError } from '@app/api-core';
import { z } from 'zod';
import type { MyBunches } from '@/shared/api/myBunches';
import { toDomainId } from '@/shared/api/ids';
import {
  CHARACTER_TYPES,
  DEFAULT_PROFILE_IMAGE,
  defaultBunchImage,
} from '@/shared/lib/bunchProfile';
import { isSafeImageUrl } from '@/shared/lib/safeImageUrl';
import type { BunchAccessNotice, BunchHomeDetail, BunchRole, BunchSummary } from '../lib/types';

type Schemas = components['schemas'];

const roleSchema = z.enum(['OWNER', 'CO_OWNER', 'MEMBER']);

/** `GET /api/v1/bunches/{bunchId}/home` 응답 */
export const bunchHomeResponseSchema = z.object({
  bunch: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    imageUrl: z.string().nullish(),
    characterType: z.enum(CHARACTER_TYPES),
    visibility: z.enum(['PUBLIC', 'PRIVATE']),
    // 소개는 계약상 필수지만 비어 올 수 있어 null도 받음(값 타입만 계약으로 검사)
    introduction: z.string().nullish(),
  }) satisfies z.ZodType<
    Omit<ApiContract<Schemas['BunchHomeProfileResponse']>, 'introduction'> & {
      introduction?: string | null | undefined;
    }
  >,
  // 내 번치가 아닌 번치(EXTERNAL)를 조회하면 소속·개수는 null이라 nullable로 받고, 변환에서 걸러냄
  myMembership: z
    .object({
      membershipId: z.number().int().positive(),
      role: roleSchema,
      joinedAt: z.string(),
    })
    .nullish() satisfies z.ZodType<Schemas['MyMembershipResponse'] | null | undefined>,
  permissions: z.object({
    canEditProfile: z.boolean(),
    canDeleteBunch: z.boolean(),
    canManageRoles: z.boolean(),
    canTransferOwner: z.boolean(),
    canBlock: z.boolean(),
    canInvite: z.boolean(),
    canLeave: z.boolean(),
  }),
  profileVersion: z.number().int().nonnegative().nullish(),
  membershipVersion: z.number().int().nonnegative().nullish(),
  memberCount: z.number().int().nonnegative(),
  followerCount: z.number().int().nonnegative(),
  followingCount: z.number().int().nonnegative(),
  draftCount: z.number().int().nonnegative().nullish(),
  publishedCount: z.number().int().nonnegative().nullish(),
  stage: z.number().int().nonnegative(),
  unreadCount: z.number().int().nonnegative().nullish(),
  // 내 번치(INTERNAL)·다른 번치(EXTERNAL) 구분과 지금 번치 명의의 팔로우·열람 범위(Swagger 필수, 이전 응답과 호환되게 선택으로 받음)
  accessScope: z.enum(['INTERNAL', 'EXTERNAL']).optional(),
  followState: z.enum(['NONE', 'REQUESTED', 'FOLLOWING']).optional(),
  followId: z.number().int().positive().nullish(),
  canViewBundles: z.boolean().optional(),
  canViewMembers: z.boolean().optional(),
  canViewRelations: z.boolean().optional(),
  isCurrentBunch: z.boolean().optional(),
  // 서버가 이 응답의 명의로 본 번치(지금 번치)
  currentBunchId: z.number().int().positive().nullish(),
}) satisfies z.ZodType<
  // 중첩 객체는 위에서 따로 묶고, 계약상 필수지만 선택으로 받는 접근 범위 필드는 값 타입만 맞춤
  Omit<
    ApiContract<Schemas['BunchHomeResponse']>,
    | 'bunch'
    | 'myMembership'
    | 'accessScope'
    | 'followState'
    | 'canViewBundles'
    | 'canViewMembers'
    | 'canViewRelations'
    | 'isCurrentBunch'
  > &
    ApiContract<
      Partial<
        Pick<
          Schemas['BunchHomeResponse'],
          | 'accessScope'
          | 'followState'
          | 'canViewBundles'
          | 'canViewMembers'
          | 'canViewRelations'
          | 'isCurrentBunch'
        >
      >
    > & { bunch: unknown; myMembership?: unknown }
>;

/** `GET /api/v1/bunches/{bunchId}/published-bundles` 응답(발행 최신순) */
// 계약 미연결: 카드에 필요한 필드만 받음(필수인 locations·likeCount·commentCount 등 생략), visibility는 명세에 없는 필드라 따로 받음
export const publishedBundlesPageSchema = z.object({
  items: z.array(
    z.object({
      id: z.number().int().positive(),
      bunchId: z.number().int().positive(),
      title: z.string(),
      coverImageUrl: z.string().nullish(),
      date: z.string().nullish(),
      location: z.unknown().nullish(),
      publishedAt: z.string().nullish(),
      // 명세에 아직 없는 필드(백엔드 확인 필요). 표시용이라 모르는 값이어도 목록을 깨지 않게 문자열로 받음
      visibility: z.string().nullish(),
    }),
  ),
  page: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(),
  hasNext: z.boolean(),
});

// `GET /bunches/{id}/bundles?status=DRAFT`의 항목은 번들 전체(BundleSnapshot)지만 번치 홈 카드에는 제목·대표 사진·참여 멤버만 필요해 그만큼만 받음
// 계약 미연결: 번치 홈 카드에 필요한 제목·사진·참여 멤버만 받음(BundlePage의 쪽 정보·나머지 필드 생략)
export const draftBundlesPageSchema = z.object({
  items: z.array(
    z.object({
      id: z.number().int().positive(),
      title: z.string(),
      photos: z.array(z.object({ imageUrl: z.string(), position: z.number().int().nonnegative() })),
      participants: z.array(z.object({ memberId: z.number().int().positive() })),
    }),
  ),
});

export type Home = z.infer<typeof bunchHomeResponseSchema>;
type PublishedPage = z.infer<typeof publishedBundlesPageSchema>;
type DraftPage = z.infer<typeof draftBundlesPageSchema>;

/** 참여 멤버 카드에 쓰는 번치 멤버(이름·프로필 이미지, id로 찾음) */
export type DraftMemberSource = { id: string; name: string; avatarSrc: string };

const ROLE: Readonly<Record<z.infer<typeof roleSchema>, BunchRole>> = {
  OWNER: 'owner',
  CO_OWNER: 'coOwner',
  MEMBER: 'member',
};

// 기획 원문 없는 임시 이름: 제목을 아직 쓰지 않은 작성 중인 번들 카드
const UNTITLED_DRAFT = '제목 없는 번들';

// 안전하지 않은 이미지 주소는 항목 하나 때문에 홈 전체가 실패하지 않도록 기본 이미지로 대체
const safeImage = (url: string | null | undefined, fallback: string) =>
  url && isSafeImageUrl(url) ? url : fallback;

/**
 * 서버 응답을 번치 홈 화면의 프로필·번들 모양으로 변환, 내 번치가 아니면(소속 null) undefined
 * 작성 중인 번들은 초안 목록(최근 수정순)의 대표 사진(첫 사진)과 참여 멤버로 카드를 만듦
 */
export const toBunchHomeDetail = (
  home: Home,
  published: Pick<PublishedPage, 'items'>,
  drafts: DraftPage,
  members: readonly DraftMemberSource[],
): BunchHomeDetail | undefined => {
  if (!home.myMembership) return undefined;
  // 대표 이미지·번들 표지가 없으면 이 번치 타입의 기본 이미지(멤버 사진은 기본 프로필 이미지)
  const fallback = defaultBunchImage(home.bunch.characterType);
  return {
    id: toDomainId(home.bunch.id),
    name: home.bunch.name,
    // 대표 이미지가 없으면 성격별 기본 이미지
    imageSrc: safeImage(home.bunch.imageUrl, fallback),
    characterType: home.bunch.characterType,
    stage: home.stage,
    description: home.bunch.introduction ?? '',
    isPrivate: home.bunch.visibility === 'PRIVATE',
    myRole: ROLE[home.myMembership.role],
    followerCount: home.followerCount,
    followingCount: home.followingCount,
    memberCount: home.memberCount,
    completedBundles: published.items.map((bundle) => ({
      id: toDomainId(bundle.id),
      title: bundle.title,
      coverSrc: safeImage(bundle.coverImageUrl, fallback),
      memberOnly: bundle.visibility === 'PRIVATE',
    })),
    draftBundles: drafts.items.map((bundle) => {
      const first = [...bundle.photos].sort((a, b) => a.position - b.position)[0];
      return {
        id: toDomainId(bundle.id),
        // 제목은 아직 안 쓴 초안일 수 있어 비어 있으면 임시 이름(기획 원문 없음)
        title: bundle.title.trim() === '' ? UNTITLED_DRAFT : bundle.title,
        coverSrc: safeImage(first?.imageUrl, fallback),
        members: bundle.participants.flatMap(({ memberId }) => {
          const member = members.find((candidate) => candidate.id === toDomainId(memberId));
          return member
            ? [{ name: member.name, imageSrc: safeImage(member.avatarSrc, DEFAULT_PROFILE_IMAGE) }]
            : [];
        }),
      };
    }),
  };
};

// `members/me/bunches` 응답 스키마·요청은 탈퇴 화면 등도 쓰므로 shared(`shared/api/myBunches.ts`)가 소유
const lastUsedTime = (value: string) => Date.parse(value) || 0;

/**
 * 번치 전환 목록: 지금 번치를 맨 위, 나머지 소속 번치는 최근 사용순, 접근 불가 번치는 맨 아래(5.2.1)
 * 접근 불가 줄은 같은 번치의 안내가 여러 건일 수 있어 안내 ID로 구분
 */
export const toBunchSummaries = (data: MyBunches, currentId: string): BunchSummary[] => {
  const active = [...data.activeBunches]
    .sort((a, b) => lastUsedTime(b.lastUsedAt) - lastUsedTime(a.lastUsedAt))
    .map(({ bunch, unreadCount }): BunchSummary => ({
      id: toDomainId(bunch.id),
      name: bunch.name,
      imageSrc: safeImage(bunch.imageUrl, defaultBunchImage(bunch.characterType)),
      alertCount: unreadCount,
      access: 'active',
    }));
  const unavailable = data.unavailableBunches.map((notice): BunchSummary => ({
    id: `notice-${toDomainId(notice.id)}`,
    name: notice.name,
    imageSrc: defaultBunchImage(notice.characterType),
    alertCount: 0,
    access: notice.reason === 'DELETED' ? 'deleted' : 'removed',
    noticeId: toDomainId(notice.id),
  }));
  return [
    ...active.filter((bunch) => bunch.id === currentId),
    ...active.filter((bunch) => bunch.id !== currentId),
    ...unavailable,
  ];
};

/** `PUT /bunches/{bunchId}/profile` 응답. 값은 쓰지 않아 정수·범위 제약 없이 숫자만 확인 */
export const bunchProfileResponseSchema = z.object({
  bunchId: z.number(),
  profileVersion: z.number(),
}) satisfies z.ZodType<ApiContract<components['schemas']['BunchProfileResponse']>>;

/** 프로필 편집 화면이 쓰는 번치 프로필. 대표 사진이 없거나 안전하지 않은 주소면 `imageSrc`는 없음(기본 이미지) */
export type EditableBunchProfile = {
  name: string;
  description: string;
  isPrivate: boolean;
  imageSrc: string | undefined;
  characterType: Home['bunch']['characterType'];
  /** 저장 요청의 `expectedProfileVersion`. 서버가 주지 않으면 undefined(저장하지 않음) */
  profileVersion: number | undefined;
  /** 프로필을 바꿀 수 있는지(서버 권한, 지금은 메인 관리자) */
  canEdit: boolean;
};

export const toEditableBunchProfile = (home: Home): EditableBunchProfile => ({
  name: home.bunch.name,
  description: home.bunch.introduction ?? '',
  isPrivate: home.bunch.visibility === 'PRIVATE',
  imageSrc:
    home.bunch.imageUrl && isSafeImageUrl(home.bunch.imageUrl) ? home.bunch.imageUrl : undefined,
  characterType: home.bunch.characterType,
  profileVersion: home.profileVersion ?? undefined,
  canEdit:
    home.myMembership !== null &&
    home.myMembership !== undefined &&
    home.permissions.canEditProfile,
});

/** `GET /api/v1/members/me/bunch-access-notices/{noticeId}` 응답(명세 078): 삭제·내보내진 번치의 안내 */
export const bunchAccessNoticeResponseSchema = z.object({
  id: z.number().int().positive(),
  bunchId: z.number().int().positive(),
  name: z.string(),
  characterType: z.enum(CHARACTER_TYPES),
  reason: z.enum(['REMOVED', 'DELETED']),
  occurredAt: z.string(),
  expiresAt: z.string(),
}) satisfies z.ZodType<ApiContract<Schemas['BunchAccessNoticeResponse']>>;

export const toBunchAccessNotice = (
  notice: z.infer<typeof bunchAccessNoticeResponseSchema>,
): BunchAccessNotice => ({
  noticeId: toDomainId(notice.id),
  name: notice.name,
  access: notice.reason === 'DELETED' ? 'deleted' : 'removed',
});

// 내보내졌거나 삭제된 번치를 보려 할 때 서버 오류 본문(명세 074 등 `409 BUNCH_008`, detail에 안내 ID)
// 계약 미연결: Swagger `ApiError.detail`에 필드가 없어 노션 명세 기준
const accessUnavailableErrorSchema = z.object({
  error: z.object({
    code: z.literal('BUNCH_008'),
    detail: z.object({ noticeId: z.number().int().positive() }),
  }),
});

/** `BUNCH_008` 오류면 그 안내 ID, 아니면 undefined */
export const accessNoticeIdOf = (error: unknown): string | undefined => {
  if (!isApiError(error)) return undefined;
  const parsed = accessUnavailableErrorSchema.safeParse(error.data);
  return parsed.success ? toDomainId(parsed.data.error.detail.noticeId) : undefined;
};
