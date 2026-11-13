import type { ApiContract } from '@app/api-core';
import type { components } from '@app/api-core/generated';
import { z } from 'zod';
import { toDomainId } from '@/shared/api/ids';
import type { BlockedBunch } from '../lib/types';
import { bunchCardSchema, card, pageOf } from './follows';

/** `GET /bunches/{viewerId}/blocks` 응답(최근 차단순) */
export const blockPageSchema = pageOf(
  z.object({
    id: z.number().int().positive(),
    bunch: bunchCardSchema,
    blockedAt: z.string(),
  }),
);

/** `POST /bunches/{viewerId}/reports` 응답 */
export const bunchReportResultSchema = z.object({
  reportId: z.number().int().positive(),
}) satisfies z.ZodType<ApiContract<components['schemas']['BunchReportResult']>>;

export type BlockPage = z.infer<typeof blockPageSchema>;

type ReportReason = components['schemas']['BunchReportRequest']['reason'];

/** 화면 신고 사유(`shared/lib/reportReasons`)를 서버 값으로. 모르는 값은 undefined */
export const REPORT_REASON: Readonly<Record<string, ReportReason>> = {
  spam: 'SPAM',
  inappropriate: 'INAPPROPRIATE',
  harassment: 'HARASSMENT',
  privacy: 'PERSONAL_INFORMATION',
  other: 'OTHER',
};

export const toBlockedBunches = (page: BlockPage): BlockedBunch[] =>
  page.items.map((item) => {
    const { id, name, imageSrc } = card(item.bunch);
    return { id, name, imageSrc, blockId: toDomainId(item.id) };
  });
