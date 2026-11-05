import { ApiError } from './error';

/** 서버 공통 응답 형태(성공은 `data`, 실패는 `error`) */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: { code?: string; message?: string; detail?: unknown } | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** 성공 envelope의 `data` 반환. 실패 envelope이나 다른 형태면 `ApiError` */
export const unwrapEnvelope = <T>(body: unknown): T => {
  if (isRecord(body) && body.success === true) return body.data as T;

  const error = isRecord(body) && isRecord(body.error) ? body.error : undefined;
  throw new ApiError({
    message: typeof error?.message === 'string' ? error.message : '응답 형식이 올바르지 않습니다.',
    category: 'server',
    code: typeof error?.code === 'string' ? error.code : undefined,
    data: body,
  });
};
