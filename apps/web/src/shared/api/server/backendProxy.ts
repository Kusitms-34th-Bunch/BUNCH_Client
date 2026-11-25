import 'server-only';
import { ApiError } from '@app/api-core';
import { type NextRequest } from 'next/server';
import { authCookieNames } from './authCookies';
import { toErrorResponse } from './routeError';
import { apiBaseUrl, isStagingUserAgent } from './serverClient';

const BACKEND_PREFIX = 'api/v1/';
const TIMEOUT_MS = 10_000;
// 멱등 키는 번치 생성·초대 참여·번들 발행처럼 재전송이 한 번만 처리돼야 하는 요청에 필수라 그대로 전달
const FORWARDED_REQUEST_HEADERS = ['accept', 'content-type', 'idempotency-key'];
// 사진 이동·참여자 변경 같은 요청의 상관 ID(재시도에 같은 값을 써야 서버가 중복 적용을 막음). UUID 형식만 전달하고 아니면 버려 서버가 새로 만들게 함
const REQUEST_ID_HEADER = 'x-request-id';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Set-Cookie 등은 버리고 본문 해석에 필요한 헤더만 전달
const FORWARDED_RESPONSE_HEADERS = ['cache-control', 'content-disposition', 'content-type'];

// 백엔드 `auth/` 아래지만 토큰·쿠키를 다루지 않는 약관 API만 프록시 허용(정확히 일치하는 경로만)
const PROXIED_AUTH_PATHS = ['auth/terms', 'auth/terms/agreements'];
// 앱 진입마다 부르는 로그인 상태 확인(GET). access 쿠키가 없으면 백엔드를 거치지 않고 바로 401(첫 실행에서 백엔드 응답을 기다리지 않게)
// 브라우저는 이 401로 재발급을 시도하므로 refresh 쿠키만 남은 세션도 그대로 이어짐
const SESSION_CHECK_PATH = BACKEND_PREFIX + 'members/me/onboarding';

/**
 * BFF 경로 조각 → 백엔드 경로(`/api/x` → `api/v1/x`). 쓸 수 없으면 undefined
 * 인증 경로는 쿠키 발급이 필요해 `/api/auth/*` Route Handler만 사용(약관 API 제외), `.`·`..`·구분자가 든 조각은 경로 조작으로 차단
 */
export const toBackendPath = (segments: string[]): string | undefined => {
  if (segments.length === 0) return undefined;
  // `Auth/…`처럼 대소문자만 바꿔 우회하지 못하도록 소문자로 비교(허용 목록은 정확히 일치해야 함)
  if (segments[0]?.toLowerCase() === 'auth' && !PROXIED_AUTH_PATHS.includes(segments.join('/'))) {
    return undefined;
  }

  const isSafe = (segment: string) =>
    segment !== '' &&
    segment !== '.' &&
    segment !== '..' &&
    !/[/\\]/.test(segment) &&
    [...segment].every((char) => char.charCodeAt(0) >= 0x20);
  if (!segments.every(isSafe)) return undefined;

  return BACKEND_PREFIX + segments.map(encodeURIComponent).join('/');
};

/** 일반 요청을 백엔드로 전달: access 쿠키는 Bearer로, 브라우저 쿠키는 미전달, 상태·본문은 그대로 */
export const proxyToBackend = async (request: NextRequest, segments: string[]) => {
  const path = toBackendPath(segments);
  if (!path) {
    return Response.json(
      { message: '지원하지 않는 경로입니다.', code: 'BFF_NOT_FOUND' },
      { status: 404 },
    );
  }

  const accessToken = request.cookies.get(authCookieNames(request).access)?.value;
  if (!accessToken && request.method === 'GET' && path === SESSION_CHECK_PATH) {
    return Response.json(
      { message: '인증이 필요합니다', code: 'BFF_UNAUTHENTICATED' },
      { status: 401, headers: { 'cache-control': 'private, no-store' } },
    );
  }

  try {
    const baseUrl = await apiBaseUrl();
    const target = new URL(path + request.nextUrl.search, baseUrl);

    const headers = new Headers();
    for (const name of FORWARDED_REQUEST_HEADERS) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    const requestId = request.headers.get(REQUEST_ID_HEADER);
    if (requestId && UUID.test(requestId)) headers.set(REQUEST_ID_HEADER, requestId);
    if (accessToken) headers.set('authorization', `Bearer ${accessToken}`);

    const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
    // timeout은 응답 헤더 수신까지만(큰 본문 전송·다운로드 중간 차단 방지)
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      ...(hasBody ? { body: await request.arrayBuffer() } : {}),
      redirect: 'manual',
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    const responseHeaders = new Headers();
    for (const name of FORWARDED_RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    // 사용자별 응답이 브라우저·중간 캐시에 남지 않도록 기본은 저장 금지
    // 테스터용 쉘(개발 백엔드) 응답은 같은 주소의 운영 응답과 공유 캐시에서 섞이지 않게 항상 저장 금지(#581)
    if (
      !responseHeaders.has('cache-control') ||
      isStagingUserAgent(request.headers.get('user-agent'))
    )
      responseHeaders.set('cache-control', 'private, no-store');
    // 개발 백엔드를 쓰는 배포는 같은 주소라도 User-Agent에 따라 응답 백엔드가 달라 캐시 키에 포함
    if (process.env.API_BASE_URL_STAGING) responseHeaders.append('vary', 'User-Agent');
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    if (error instanceof ApiError) return toErrorResponse(error);
    return toErrorResponse(
      new ApiError({ message: 'Backend unavailable', category: 'network', cause: error }),
    );
  }
};
