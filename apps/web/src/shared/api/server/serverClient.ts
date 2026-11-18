import 'server-only';
import { ApiError } from '@app/api-core';
import ky, { type KyInstance } from 'ky';

export interface ServerApiOptions {
  baseUrl?: string;
  timeoutMs?: number;
  /** 백엔드 인증(`Authorization: Bearer`). BFF가 쿠키에서 꺼낸 access 토큰 */
  accessToken?: string;
}

/**
 * 백엔드 주소. 서버 전용 환경 변수라 브라우저 번들에 포함되지 않음
 * 끝 `/` 보정(경로가 든 주소에서 상대 경로 해석이 마지막 경로를 버리는 것 방지)
 */
export const apiBaseUrl = () => {
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) {
    throw new ApiError({ message: 'API_BASE_URL이 설정되지 않았습니다.', category: 'unknown' });
  }
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
};

/** RSC·Route Handler 전용 백엔드 클라이언트(쿠키 대신 Bearer 토큰으로 인증) */
export const createServerApi = ({
  baseUrl = apiBaseUrl(),
  timeoutMs = 10_000,
  accessToken,
}: ServerApiOptions = {}): KyInstance =>
  ky.create({
    baseUrl,
    timeout: timeoutMs,
    ...(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}),
  });
