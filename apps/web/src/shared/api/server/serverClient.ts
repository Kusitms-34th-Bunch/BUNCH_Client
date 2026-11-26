import 'server-only';
import { ApiError } from '@app/api-core';
import { STAGING_SHELL_USER_AGENT } from '@app/bridge';
import ky, { type KyInstance } from 'ky';
import { headers } from 'next/headers';

export interface ServerApiOptions {
  baseUrl?: string;
  timeoutMs?: number;
  /** 백엔드 인증(`Authorization: Bearer`). BFF가 쿠키에서 꺼낸 access 토큰 */
  accessToken?: string;
}

/** TestFlight 테스터용 쉘의 요청인지(#581). 개발 주소가 설정된 배포에서만 참이라 백엔드·인증 쿠키 선택이 같이 움직임 */
export const isStagingUserAgent = (userAgent: string | null | undefined) =>
  Boolean(process.env.API_BASE_URL_STAGING) &&
  Boolean(userAgent?.includes(STAGING_SHELL_USER_AGENT));

/**
 * 백엔드 주소. 서버 전용 환경 변수라 브라우저 번들에 포함되지 않음. 테스터용 쉘 요청은 `API_BASE_URL_STAGING`(개발 백엔드)
 * 끝 `/` 보정(경로가 든 주소에서 상대 경로 해석이 마지막 경로를 버리는 것 방지)
 */
export const apiBaseUrl = async () => {
  // 개발 주소가 없으면 요청 헤더를 읽지 않음
  const staging =
    process.env.API_BASE_URL_STAGING && isStagingUserAgent((await headers()).get('user-agent'));
  const baseUrl = staging ? process.env.API_BASE_URL_STAGING : process.env.API_BASE_URL;
  if (!baseUrl) {
    throw new ApiError({ message: 'API_BASE_URL이 설정되지 않았습니다.', category: 'unknown' });
  }
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
};

/** RSC·Route Handler 전용 백엔드 클라이언트(쿠키 대신 Bearer 토큰으로 인증) */
export const createServerApi = async ({
  baseUrl,
  timeoutMs = 10_000,
  accessToken,
}: ServerApiOptions = {}): Promise<KyInstance> =>
  ky.create({
    baseUrl: baseUrl ?? (await apiBaseUrl()),
    timeout: timeoutMs,
    ...(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}),
  });
