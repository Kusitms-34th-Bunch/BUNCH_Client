import type { ApiContract } from '@app/api-core';
import type { components } from '@app/api-core/generated';
import { z } from 'zod';

/** 이름(닉네임·번치 이름) 확인 결과: 사용 가능, 이미 사용 중, 금칙어 포함 */
export type NameCheckResult = 'available' | 'taken' | 'prohibited';

/**
 * 닉네임·번치 이름 확인 응답. 금칙어가 중복보다 앞서고 `available`은 `AVAILABLE`일 때만 true(서버 금칙어 계약, BUNCH_Server#163)
 */
export const nameAvailabilitySchema = z.object({
  normalizedValue: z.string(),
  available: z.boolean(),
  status: z.enum(['AVAILABLE', 'DUPLICATE', 'PROHIBITED_WORD']),
}) satisfies z.ZodType<ApiContract<components['schemas']['NameAvailability']>>;

const RESULT_BY_STATUS = {
  AVAILABLE: 'available',
  DUPLICATE: 'taken',
  PROHIBITED_WORD: 'prohibited',
} as const satisfies Record<z.infer<typeof nameAvailabilitySchema>['status'], NameCheckResult>;

export const toNameCheckResult = ({
  status,
}: z.infer<typeof nameAvailabilitySchema>): NameCheckResult => RESULT_BY_STATUS[status];
