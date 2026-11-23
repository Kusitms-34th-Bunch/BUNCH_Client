import { ApiError } from '@app/api-core';
import { z } from 'zod';

// 번들 API 오류 응답 판독(요청 도구 없이 화면·lib에서도 읽음)

/** 오류의 서버 코드(`BUNDLE_003` 등), 없으면 undefined */
export const errorCodeOf = (error: unknown) => (error as { code?: string } | null)?.code;

const errorEnvelopeSchema = z.object({ error: z.object({ detail: z.unknown() }) });

/** 오류 응답 본문의 `error.detail`을 스키마로 읽음(모양이 다르면 undefined) */
export const readErrorDetail = <T extends z.ZodType>(
  error: ApiError,
  schema: T,
): z.output<T> | undefined => {
  const envelope = errorEnvelopeSchema.safeParse(error.data);
  if (!envelope.success) return undefined;
  const detail = schema.safeParse(envelope.data.error.detail);
  return detail.success ? detail.data : undefined;
};

/** 발행 차단(BUNDLE_005)의 사유 목록, 다른 오류면 undefined */
export const readPublishBlockers = (error: unknown): readonly string[] | undefined => {
  if (!(error instanceof ApiError) || error.code !== 'BUNDLE_005') return undefined;
  const detail = readErrorDetail(error, z.object({ reasons: z.array(z.unknown()) }));
  return detail ? detail.reasons.filter((r): r is string => typeof r === 'string') : [];
};
