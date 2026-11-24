import type { ApiContract } from '@app/api-core';
import type { components } from '@app/api-core/generated';
import { z } from 'zod';
import { toDomainId } from '@/shared/api/client/ids';
import { defaultBunchImage, DEFAULT_PROFILE_IMAGE } from '@/shared/lib/profile/bunchProfile';
import type { FeedFollowStatus, FeedMemberProfile } from '../lib/types';
import { imageOrUndefined } from './feed';

/** `GET /members/{memberId}/social-profile` 응답(명세 020, Swagger `MemberSocialProfileResponse`) */
export const memberSocialProfileSchema = z.object({
  memberId: z.number().int().positive(),
  nickname: z.string().nullish(),
  imageUrl: z.string().nullish(),
  bunches: z.array(
    z.object({
      bunch: z.object({
        id: z.number().int().positive(),
        name: z.string(),
        imageUrl: z.string().nullish(),
        characterType: z.enum(['TYPE_1', 'TYPE_2', 'TYPE_3', 'TYPE_4']),
        visibility: z.enum(['PUBLIC', 'PRIVATE']),
      }),
      // 지금 번치 기준. 소속 번치가 없으면 NONE
      followState: z.enum(['NONE', 'REQUESTED', 'FOLLOWING']),
      // 취소·언팔로우에 쓰는 관계 ID
      followId: z.number().int().positive().nullish(),
      showFollowButton: z.boolean(),
    }),
  ),
}) satisfies z.ZodType<ApiContract<components['schemas']['MemberSocialProfileResponse']>>;
export type MemberSocialProfile = z.infer<typeof memberSocialProfileSchema>;

const FOLLOW_STATUS: Record<'NONE' | 'REQUESTED' | 'FOLLOWING', FeedFollowStatus> = {
  NONE: 'none',
  REQUESTED: 'requested',
  FOLLOWING: 'following',
};

export const toFeedMemberProfile = (profile: MemberSocialProfile): FeedMemberProfile => ({
  id: toDomainId(profile.memberId),
  name: profile.nickname ?? '',
  imageSrc: imageOrUndefined(profile.imageUrl) ?? DEFAULT_PROFILE_IMAGE,
  bunches: profile.bunches.map(({ bunch, followState, followId, showFollowButton }) => ({
    id: toDomainId(bunch.id),
    name: bunch.name,
    imageSrc: imageOrUndefined(bunch.imageUrl) ?? defaultBunchImage(bunch.characterType),
    isPrivate: bunch.visibility === 'PRIVATE',
    followStatus: FOLLOW_STATUS[followState],
    followId: followId == null ? undefined : toDomainId(followId),
    showFollowButton,
  })),
});
