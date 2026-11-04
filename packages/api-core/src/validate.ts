import type { z, ZodType } from 'zod';
import { ApiError } from './error';

/** 응답 계약 위반 코드(서버 오류 코드와 겹치지 않는 앱 전용 값) */
export const INVALID_RESPONSE_CODE = 'INVALID_RESPONSE';

/**
 * 응답을 스키마로 검사해 반환. 계약과 다르면 `ApiError`(category `validation`, code `INVALID_RESPONSE`)
 * 어느 응답인지(`context`)와 어긋난 위치(`issues`)는 화면 문구가 아니라 `data`에 담음
 */
export const parseOrThrow = <Schema extends ZodType>(
  schema: Schema,
  data: unknown,
  context?: string,
): z.infer<Schema> => {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  throw new ApiError({
    message: '응답 형식이 올바르지 않습니다.',
    category: 'validation',
    code: INVALID_RESPONSE_CODE,
    data: { context, issues: result.error.issues },
    cause: result.error,
  });
};
