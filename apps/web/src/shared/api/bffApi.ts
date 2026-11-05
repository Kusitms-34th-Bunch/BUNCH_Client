import type { ResponsePromise } from 'ky';
import type { z, ZodType } from 'zod';
import { normalizeError, parseOrThrow, unwrapEnvelope } from '@app/api-core';
import { createBrowserApi } from './browserClient';

/**
 * 브라우저 → BFF 요청 클라이언트. feature `api/` 함수에서만 사용
 * 재발급까지 실패한 401은 ApiError(auth)로만 전달, 로그인 이동(`onUnauthorized`)은 로그인 API 연동 때 연결
 */
export const bffApi = createBrowserApi();

/**
 * BFF 응답의 `data`를 스키마로 검사해 반환(envelope 해제 → zod 검사). 본문 없는 204 응답에는 사용 불가
 * HTTP 오류·실패 envelope·계약 위반·네트워크 오류는 모두 `ApiError`로 던짐(화면은 `code`로 분기)
 */
export const requestData = async <Schema extends ZodType>(
  request: ResponsePromise,
  schema: Schema,
  context: string,
): Promise<z.infer<Schema>> => {
  try {
    return parseOrThrow<Schema>(schema, unwrapEnvelope(await request.json()), context);
  } catch (error) {
    throw normalizeError(error);
  }
};
