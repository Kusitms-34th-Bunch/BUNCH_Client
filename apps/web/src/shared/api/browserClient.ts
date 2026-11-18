import { ApiError } from '@app/api-core';
import { createHttpClient } from '@app/api-core/http';
import { HTTPError, type KyInstance } from 'ky';

export interface BrowserApiOptions {
  /** BFF 주소. 기본은 같은 출처의 `/api/` */
  baseUrl?: string;
  timeoutMs?: number;
  /** 세션 재발급. 기본은 `POST /api/auth/reissue`(refresh 쿠키 사용), 성공 여부 반환. 일시 장애면 `ApiError`를 던짐 */
  refreshSession?: () => Promise<boolean>;
  onUnauthorized?: () => void | Promise<void>;
}

const REFRESH_LOCK_NAME = 'bunch:auth-refresh';

// 재발급·세션 확인 응답을 기다리는 최대 시간(BFF의 백엔드 대기 10초보다 조금 길게)
const REISSUE_TIMEOUT_MS = 12_000;

// 응답을 받지 못함(네트워크·시간 초과): 인증 만료로 단정하지 않고 네트워크 오류로 전달
const sameOriginFetch = (path: string, init?: RequestInit) =>
  fetch(path, {
    ...init,
    credentials: 'same-origin',
    signal: AbortSignal.timeout(REISSUE_TIMEOUT_MS),
  }).catch((cause: unknown) => {
    throw new ApiError({ message: 'Session refresh unreachable', category: 'network', cause });
  });

// BFF가 백엔드에 닿지 못했다는 응답(502 `BFF_UPSTREAM_UNAVAILABLE`, 배포처의 503·504)만 일시 장애로 봄
// 그 밖의 실패(4xx, 응답 형식 오류를 바꾼 500)는 무효 토큰일 수 있어 인증 실패처럼 세션을 확인
const TRANSIENT_STATUSES = new Set([502, 503, 504]);

const transientFailure = async (response: Response) => {
  const body = (await response.json().catch(() => undefined)) as
    | { message?: unknown; code?: unknown }
    | undefined;
  return new ApiError({
    message: typeof body?.message === 'string' ? body.message : 'Session refresh failed',
    category: 'server',
    status: response.status,
    code: typeof body?.code === 'string' ? body.code : undefined,
    data: body,
  });
};

// 일시 장애가 아니면 다른 탭이 먼저 교체한 새 쿠키가 있는지 확인(있으면 세션 유지)
const reissueSession = async () => {
  const reissued = await sameOriginFetch('/api/auth/reissue', { method: 'POST' });
  if (reissued.ok) return true;
  if (TRANSIENT_STATUSES.has(reissued.status)) throw await transientFailure(reissued);
  const session = await sameOriginFetch('/api/session');
  return session.ok;
};

// 로그인·재발급·로그아웃 자체의 401은 재발급 대상 아님(재발급 반복 방지). 같은 `/api/auth/` 아래여도 약관 API는 일반 요청이라 재발급 대상
const COOKIE_AUTH_PATHS = new Set(['/api/auth/login', '/api/auth/reissue', '/api/auth/logout']);
const isAuthRoute = (request: Request) => COOKIE_AUTH_PATHS.has(new URL(request.url).pathname);

/**
 * 브라우저 → BFF 클라이언트. 토큰은 httpOnly 쿠키라 브라우저가 다루지 않음
 * 401이면 세션을 한 번 재발급(같은 탭은 Promise, 탭 사이는 Web Locks로 묶음)한 뒤 한 번 재시도
 * 재발급이 일시 장애로 실패하면 그 오류로 요청을 끝냄(인증 만료로 바꾸지 않고, 재시도는 Query 정책에 맡김)
 */
export const createBrowserApi = ({
  baseUrl = '/api/',
  timeoutMs,
  refreshSession = reissueSession,
  onUnauthorized,
}: BrowserApiOptions = {}): KyInstance => {
  let refreshing: Promise<boolean> | undefined;

  const lockedRefresh = async (): Promise<boolean> =>
    typeof navigator !== 'undefined' && navigator.locks
      ? navigator.locks.request(REFRESH_LOCK_NAME, refreshSession)
      : refreshSession();

  const refresh = () => {
    refreshing ??= lockedRefresh().finally(() => {
      refreshing = undefined;
    });
    return refreshing;
  };

  return createHttpClient({
    baseUrl,
    timeoutMs,
    hooks: {
      // 재발급 뒤 재시도도 401이면(백엔드가 토큰을 폐기한 경우 등) 세션 종료로 처리
      afterResponse: [
        async ({ request, response, retryCount }) => {
          if (response.status === 401 && retryCount >= 1 && !isAuthRoute(request)) {
            await onUnauthorized?.();
          }
        },
      ],
      beforeRetry: [
        async ({ request, error }) => {
          // 401 재발급만 재시도(네트워크·5xx 재시도는 Query의 createRetryPolicy 담당, POST 중복 전송 방지)
          if (!(error instanceof HTTPError) || error.response.status !== 401) throw error;
          if (isAuthRoute(request)) throw error;
          if (await refresh()) return;

          await onUnauthorized?.();
          throw error;
        },
      ],
    },
    retry: {
      limit: 1,
      methods: ['get', 'post', 'put', 'patch', 'delete'],
      statusCodes: [401],
    },
  });
};
