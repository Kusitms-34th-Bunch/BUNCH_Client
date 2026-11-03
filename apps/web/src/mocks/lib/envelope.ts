import type { ApiEnvelope } from '@app/api-core';
import { HttpResponse, type JsonBodyType } from 'msw';

// 명세의 오류 예시에 있는 메시지 키, 나머지 코드는 `error.<코드>` 임시 값(화면은 코드로 분기)
const SPEC_MESSAGES: Readonly<Record<string, string>> = {
  AUTH_001: 'error.unauthorized',
  AUTH_002: 'error.forbidden',
  BUNDLE_001: 'error.bundle_limit_exceeded',
};

/** 백엔드 공통 응답(`success/data/error`)의 성공 200 */
export const ok = <T extends JsonBodyType>(data: T) =>
  HttpResponse.json<ApiEnvelope<T>>({ success: true, data, error: null });

/** 백엔드 공통 응답의 실패, detail은 충돌 응답처럼 현재 값을 전달할 때만 사용 */
export const fail = (status: number, code: string, detail: JsonBodyType = null) =>
  HttpResponse.json<ApiEnvelope<never>>(
    {
      success: false,
      data: null,
      error: { code, message: SPEC_MESSAGES[code] ?? `error.${code.toLowerCase()}`, detail },
    },
    { status },
  );

/** 본문 없는 204 성공 응답(BFF 재발급·로그아웃) */
export const noContent = () => new HttpResponse(null, { status: 204 });
