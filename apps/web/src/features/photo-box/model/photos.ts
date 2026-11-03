import type { ApiContract } from '@app/api-core';
import type { components } from '@app/api-core/generated';
import { z } from 'zod';

/**
 * `POST /api/v1/bunches/{bunchId}/photos/delete` 응답
 * 사라진 사진 수와 함께 올린 사진에서 내 표시만 빠진 수(docs/specs/photo-box.md 데이터 표 기준 해석, 서버 확인 전)
 */
export const photoDeleteResponseSchema = z.object({
  deletedCount: z.number().int().nonnegative(),
  uploaderRemovedCount: z.number().int().nonnegative(),
}) satisfies z.ZodType<ApiContract<components['schemas']['PhotoDeleteResponse']>>;

export type PhotoDeleteResult = z.infer<typeof photoDeleteResponseSchema>;
