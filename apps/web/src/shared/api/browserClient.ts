import { createHttpClient } from '@app/api-core/http';
import { HTTPError, type KyInstance } from 'ky';

export interface BrowserApiOptions {
  /** BFF 주소. 기본은 같은 출처의 `/api/` */
  baseUrl?: string;
  timeoutMs?: number;
  /** 세션 재발급. 기본은 `POST /api/auth/reissue`(refresh 쿠키 사용), 성공 여부 반환 */
  refreshSession?: () => Promise<boolean>;
  onUnauthorized?: () => void | Promise<void>;
}

const REFRESH_LOCK_NAME = 'bunch:auth-refresh';

// 재발급이 실패해도 다른 탭이 먼저 교체한 새 쿠키가 있으면 세션 유지로 판단
const reissueSession = async () => {
  const reissued = await fetch('/api/auth/reissue', { method: 'POST', credentials: 'same-origin' });
  if (reissued.ok) return true;
  const session = await fetch('/api/session', { credentials: 'same-origin' });
  return session.ok;
};

// 로그인·재발급·로그아웃 자체의 401은 재발급 대상 아님(재발급 반복 방지)
const isAuthRoute = (request: Request) => new URL(request.url).pathname.startsWith('/api/auth/');

/**
 * 브라우저 → BFF 클라이언트. 토큰은 httpOnly 쿠키라 브라우저가 다루지 않음
 * 401이면 세션을 한 번 재발급(같은 탭은 Promise, 탭 사이는 Web Locks로 묶음)한 뒤 한 번 재시도
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
