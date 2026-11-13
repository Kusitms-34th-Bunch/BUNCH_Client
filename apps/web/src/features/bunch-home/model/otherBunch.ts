import { z } from 'zod';
import { toDomainId } from '@/shared/api/ids';
import { defaultBunchImage } from '@/shared/lib/bunchProfile';
import { isSafeImageUrl } from '@/shared/lib/safeImageUrl';
import type { FollowStatus, OtherBunch } from '../lib/types';
import type { Home, publishedBundlesPageSchema } from './bunchHome';

const followStateSchema = z.enum(['NONE', 'REQUESTED', 'FOLLOWING']);

/** `PUT /bunches/{viewerId}/following/{targetId}` 응답 */
export const followResultSchema = z.object({
  followState: followStateSchema,
  followId: z.number().int().positive().nullish(),
});

/** `DELETE /bunches/{viewerId}/following/{targetId}?followId=` 응답 */
export const followCancellationSchema = z.object({
  followState: followStateSchema,
  cancelled: followStateSchema,
});

export const FOLLOW_STATUS: Readonly<Record<z.infer<typeof followStateSchema>, FollowStatus>> = {
  NONE: 'none',
  REQUESTED: 'requested',
  FOLLOWING: 'following',
};

/** 다른 번치 프로필 화면이 쓰는 모양(멤버 명단·처음 팔로우 상태는 따로) */
export type OtherBunchProfile = Omit<OtherBunch, 'members' | 'followStatus'>;

/** 홈 응답의 팔로우 관계 ID(화면 모양) */
export const followIdOf = (home: Home | undefined) =>
  home?.followId ? toDomainId(home.followId) : undefined;

const safeImage = (url: string | null | undefined, fallback: string) =>
  url && isSafeImageUrl(url) ? url : fallback;

/** 다른 번치의 홈·공개 번들 응답을 프로필 모양으로. 번들을 볼 수 없으면 번들은 빈 목록 */
export const toOtherBunchProfile = (
  home: Home,
  published: z.infer<typeof publishedBundlesPageSchema> | undefined,
): OtherBunchProfile => {
  const fallback = defaultBunchImage(home.bunch.characterType);
  return {
    id: toDomainId(home.bunch.id),
    name: home.bunch.name,
    imageSrc: safeImage(home.bunch.imageUrl, fallback),
    characterType: home.bunch.characterType,
    stage: home.stage,
    description: home.bunch.introduction ?? '',
    isPrivate: home.bunch.visibility === 'PRIVATE',
    followerCount: home.followerCount,
    followingCount: home.followingCount,
    memberCount: home.memberCount,
    completedBundles: (published?.items ?? []).map((bundle) => ({
      id: toDomainId(bundle.id),
      title: bundle.title,
      coverSrc: safeImage(bundle.coverImageUrl, fallback),
    })),
  };
};
