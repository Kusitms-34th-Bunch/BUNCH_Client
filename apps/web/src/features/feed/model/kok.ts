import type { ApiContract } from '@app/api-core';
import type { components } from '@app/api-core/generated';
import { z } from 'zod';

type LocationKok = ApiContract<components['schemas']['BundleLocationKokResponse']>;

/** `GET /bundles/{bundleId}/pinned-places` 응답(명세 021)에서 시트가 쓰는 장소별 값만. 장소 ID는 피드·상세 응답과 같음 */
export const bundleKoksSchema = z.object({
  locations: z.array(
    z.object({
      id: z.number().int().positive(),
      pinned: z.boolean(),
      // 콕 취소(명세 009)에 쓰는 콕 ID. 콕하지 않았으면 없음
      pinId: z.number().int().positive().nullish(),
    }) satisfies z.ZodType<Pick<LocationKok, 'id' | 'pinned' | 'pinId'>>,
  ),
});
export type BundleKoks = z.infer<typeof bundleKoksSchema>;

/** `PUT /bundles/{bundleId}/locations/{locationId}/pin` 응답(명세 010)에서 콕 ID만 */
export const kokSchema = z.object({
  id: z.number().int().positive(),
}) satisfies z.ZodType<Pick<ApiContract<components['schemas']['KokResponse']>, 'id'>>;
