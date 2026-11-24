import { z } from 'zod';
import { bffApi, requestData } from './client/bffApi';

/** 서버의 약관 종류(`GET /auth/terms`의 `type`, 동의 저장의 `type`) */
export const SERVER_TERM_TYPES = ['SERVICE', 'PRIVACY', 'AGE_OVER_14', 'DEMOGRAPHICS'] as const;
export type ServerTermType = (typeof SERVER_TERM_TYPES)[number];

/** `GET /api/v1/auth/terms` 응답(명세서 기준). 약관 원문은 앱이 갖고 서버는 종류·버전만 줌 */
// 계약 미연결: Swagger에 이 응답의 data 스키마가 없음(생성 타입이 생기면 묶음)
const termsSchema = z.object({
  terms: z.array(
    z.object({
      type: z.string(),
      version: z.string().min(1),
      required: z.boolean(),
    }),
  ),
});

export type TermVersions = Partial<Record<ServerTermType, string>>;

/** 현재 적용되는 약관별 버전. 가입 약관 동의와 MY 추가 개인정보 동의가 함께 씀 */
export const getTermVersions = async (signal?: AbortSignal): Promise<TermVersions> => {
  const { terms } = await requestData(
    bffApi.get('auth/terms', { signal: signal ?? null }),
    termsSchema,
    'terms',
  );
  // 서버가 새 약관 종류를 추가해도 앱이 쓰는 종류만 골라 약관 전체가 막히지 않게 함
  return Object.fromEntries(
    terms
      .filter(({ type }) => (SERVER_TERM_TYPES as readonly string[]).includes(type))
      .map(({ type, version }) => [type, version]),
  );
};
