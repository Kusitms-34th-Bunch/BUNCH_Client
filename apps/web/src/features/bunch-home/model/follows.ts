import type { ApiContract } from '@app/api-core';
import type { components } from '@app/api-core/generated';
import { z } from 'zod';
import { toDomainId } from '@/shared/api/ids';
import { CHARACTER_TYPES, defaultBunchImage } from '@/shared/lib/bunchProfile';
import { isSafeImageUrl } from '@/shared/lib/safeImageUrl';
import type { FollowBunch } from '../lib/types';
import { FOLLOW_STATUS } from './otherBunch';

type Schemas = components['schemas'];

/** 목록 행의 번치(Swagger `BunchSocialCard`) */
export const bunchCardSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  imageUrl: z.string().nullish(),
  characterType: z.enum(CHARACTER_TYPES),
  visibility: z.enum(['PUBLIC', 'PRIVATE']),
}) satisfies z.ZodType<ApiContract<Schemas['BunchSocialCard']>>;

export const pageOf = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number().int().nonnegative(),
    size: z.number().int().positive(),
    totalElements: z.number().int().nonnegative(),
    hasNext: z.boolean(),
  });

/** `GET /bunches/{targetId}/followers`·`following` 응답. followState는 지금 내 번치(명의)가 그 번치를 팔로우하는 상태 */
// 쪽 응답은 안쪽 선택 필드(followId·imageUrl)를 null도 받게 넓혀 생성 타입과 satisfies로 묶지 않음(카드·결정 응답만 묶음)
export const relationPageSchema = pageOf(
  z.object({
    bunch: bunchCardSchema,
    followState: z.enum(['NONE', 'REQUESTED', 'FOLLOWING']),
    followId: z.number().int().positive().nullish(),
    followedAt: z.string(),
  }),
);

/** `GET /bunches/{viewerId}/follow-requests` 응답 */
export const followRequestPageSchema = pageOf(
  z.object({
    id: z.number().int().positive(),
    bunch: bunchCardSchema,
    requestedAt: z.string(),
  }),
);

/** `POST /bunches/{viewerId}/follow-requests/{requestId}/decision` 응답. applied가 false면 이미 처리됐거나(APPROVED·REJECTED) 없어진 요청(UNAVAILABLE) */
export const followDecisionResultSchema = z.object({
  requestId: z.number().int().positive(),
  applied: z.boolean(),
  state: z.enum(['APPROVED', 'REJECTED', 'UNAVAILABLE']),
}) satisfies z.ZodType<ApiContract<Schemas['FollowDecisionResult']>>;

export type RelationPage = z.infer<typeof relationPageSchema>;
export type FollowRequestPage = z.infer<typeof followRequestPageSchema>;
export type FollowDecision = 'APPROVE' | 'REJECT';

/** 목록 한 줄(내 번치 명의의 팔로우 상태와 취소에 쓸 관계 ID) */
export type FollowRow = FollowBunch & { followId: string | undefined };

/** 탭 한 개의 목록 상태: 받는 중(rows undefined)·실패(error)·행 */
export type FollowListState =
  | { rows: readonly FollowRow[] | undefined; error?: undefined }
  | { rows?: undefined; error: { retry: () => void } };

/** 요청 한 줄(승인·거절은 요청 ID로) */
export type FollowRequestRow = Pick<FollowBunch, 'id' | 'name' | 'imageSrc' | 'isPrivate'> & {
  requestId: string;
  daysAgo: number;
};

export const card = (bunch: z.infer<typeof bunchCardSchema>) => ({
  id: toDomainId(bunch.id),
  name: bunch.name,
  imageSrc:
    bunch.imageUrl && isSafeImageUrl(bunch.imageUrl)
      ? bunch.imageUrl
      : defaultBunchImage(bunch.characterType),
  isPrivate: bunch.visibility === 'PRIVATE',
});

export const toFollowRows = (page: RelationPage): FollowRow[] =>
  page.items.map((item) => ({
    ...card(item.bunch),
    followStatus: FOLLOW_STATUS[item.followState],
    followId: item.followId ? toDomainId(item.followId) : undefined,
  }));

const DAY = 24 * 60 * 60 * 1000;

/** 요청 시각을 「N일 전」의 N으로(하루가 안 됐으면 0, 시각을 못 읽으면 0) */
export const daysSince = (iso: string, now = Date.now()) =>
  Math.max(0, Math.floor((now - (Date.parse(iso) || now)) / DAY));

export const toFollowRequestRows = (page: FollowRequestPage, now = Date.now()) =>
  page.items.map((item): FollowRequestRow => ({
    ...card(item.bunch),
    requestId: toDomainId(item.id),
    daysAgo: daysSince(item.requestedAt, now),
  }));
