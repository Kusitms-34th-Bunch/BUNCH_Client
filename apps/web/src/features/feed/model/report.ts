import type { ApiContract } from '@app/api-core';
import type { components } from '@app/api-core/generated';
import { z } from 'zod';

/** 번들·댓글 신고 응답(Swagger `SocialContentReportResult`, 명세 018·019) */
export const reportResultSchema = z.object({
  reportId: z.number().int().positive(),
}) satisfies z.ZodType<ApiContract<components['schemas']['SocialContentReportResult']>>;
