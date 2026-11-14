import type { ApiContract } from '@app/api-core';
import type { components } from '@app/api-core/generated';
import { z } from 'zod';

/** `PUT·DELETE /bundles/{bundleId}/like` 응답(Swagger `SocialLikeResponse`, 명세 011·012) */
export const likeResponseSchema = z.object({
  bundleId: z.number().int().positive(),
  // 바꾼 뒤 서버의 지금 번치(화면 명의와 다르면 번치가 바뀐 것)
  currentBunchId: z.number().int().positive().nullish(),
  likedByCurrentBunch: z.boolean(),
  likeCount: z.number().int().nonnegative(),
}) satisfies z.ZodType<ApiContract<components['schemas']['SocialLikeResponse']>>;
export type LikeResponse = z.infer<typeof likeResponseSchema>;
