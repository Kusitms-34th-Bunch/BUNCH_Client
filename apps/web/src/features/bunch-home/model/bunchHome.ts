import { z } from 'zod';
import { toDomainId } from '@/shared/api/ids';
import { DEFAULT_BUNCH_IMAGE } from '@/shared/lib/bunchProfile';
import { isSafeImageUrl } from '@/shared/lib/safeImageUrl';
import type { BunchHomeDetail, BunchRole } from '../lib/types';

// 번치 홈 조회(`/home`)와 번치 발행 번들 목록(`/published-bundles`)은 서버 PR #62 미병합 계약이라
// Swagger 생성 타입이 없어 Notion 명세 기준으로 직접 정의함, 서버가 병합되면 생성 타입으로 묶음

const roleSchema = z.enum(['OWNER', 'CO_OWNER', 'MEMBER']);

/** `GET /api/v1/bunches/{bunchId}/home` 응답 */
export const bunchHomeResponseSchema = z.object({
  bunch: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    imageUrl: z.string().nullish(),
    characterType: z.enum(['TYPE_1', 'TYPE_2', 'TYPE_3', 'TYPE_4']),
    visibility: z.enum(['PUBLIC', 'PRIVATE']),
    introduction: z.string().nullish(),
  }),
  // 내 번치가 아닌 번치(EXTERNAL)를 조회하면 소속·개수는 null이라 nullable로 받고, 변환에서 걸러냄
  myMembership: z
    .object({
      membershipId: z.number().int().positive(),
      role: roleSchema,
      joinedAt: z.string(),
    })
    .nullish(),
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
});

/** `GET /api/v1/bunches/{bunchId}/published-bundles` 응답(발행 최신순) */
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
    }),
  ),
  page: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(),
  hasNext: z.boolean(),
});

export type Home = z.infer<typeof bunchHomeResponseSchema>;
type PublishedPage = z.infer<typeof publishedBundlesPageSchema>;

const ROLE: Readonly<Record<z.infer<typeof roleSchema>, BunchRole>> = {
  OWNER: 'owner',
  CO_OWNER: 'coOwner',
  MEMBER: 'member',
};

// 안전하지 않은 이미지 주소는 항목 하나 때문에 홈 전체가 실패하지 않도록 기본 이미지로 대체
const safeImage = (url: string | null | undefined) =>
  url && isSafeImageUrl(url) ? url : DEFAULT_BUNCH_IMAGE;

/**
 * 서버 응답을 번치 홈 화면의 프로필·번들 모양으로 변환, 내 번치가 아니면(소속 null) undefined
 * 작성 중인 번들 목록은 이번 범위가 아니라 비워 둠(UT 이후 초안 목록 API로 연결)
 */
export const toBunchHomeDetail = (
  home: Home,
  published: PublishedPage,
): BunchHomeDetail | undefined => {
  if (!home.myMembership) return undefined;
  return {
    id: toDomainId(home.bunch.id),
    name: home.bunch.name,
    // 대표 이미지가 없으면 기본 번치 이미지
    imageSrc: safeImage(home.bunch.imageUrl),
    description: home.bunch.introduction ?? '',
    isPrivate: home.bunch.visibility === 'PRIVATE',
    myRole: ROLE[home.myMembership.role],
    followerCount: home.followerCount,
    followingCount: home.followingCount,
    memberCount: home.memberCount,
    completedBundles: published.items.map((bundle) => ({
      id: toDomainId(bundle.id),
      title: bundle.title,
      coverSrc: safeImage(bundle.coverImageUrl),
    })),
    draftBundles: [],
  };
};
