import type { components } from '@app/api-core/generated';
import { type ApiContract, isApiError } from '@app/api-core';
import { z } from 'zod';
import { toDomainId } from '@/shared/api/ids';
import { CHARACTER_TYPES } from '@/shared/lib/bunchProfile';
import type { BunchAccessNotice } from '../lib/types';

type Schemas = components['schemas'];

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
