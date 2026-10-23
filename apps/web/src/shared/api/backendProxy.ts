import 'server-only';
import { ApiError } from '@app/api-core';
import { type NextRequest } from 'next/server';
import { ACCESS_TOKEN_COOKIE } from './authCookies';
import { crossSiteResponse, isCrossSiteMutation } from './crossSite';
import { toErrorResponse } from './routeError';
import { apiBaseUrl } from './serverClient';

const BACKEND_PREFIX = 'api/v1/';
const TIMEOUT_MS = 10_000;
const FORWARDED_REQUEST_HEADERS = ['accept', 'content-type'];
// Set-Cookie 등은 버리고 본문 해석에 필요한 헤더만 전달
const FORWARDED_RESPONSE_HEADERS = ['cache-control', 'content-disposition', 'content-type'];

/**
 * BFF 경로 조각 → 백엔드 경로(`/api/x` → `api/v1/x`). 쓸 수 없으면 undefined
 * 인증 경로는 쿠키 발급이 필요해 `/api/auth/*` Route Handler만 사용, `.`·`..`·구분자가 든 조각은 경로 조작으로 차단
 */
export const toBackendPath = (segments: string[]): string | undefined => {
  if (segments.length === 0 || segments[0] === 'auth') return undefined;

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
  if (isCrossSiteMutation(request)) return crossSiteResponse();

  const path = toBackendPath(segments);
  if (!path) {
    return Response.json(
      { message: '지원하지 않는 경로입니다.', code: 'BFF_NOT_FOUND' },
      { status: 404 },
    );
  }

  try {
    const baseUrl = apiBaseUrl();
    const target = new URL(path + request.nextUrl.search, baseUrl);

    const headers = new Headers();
    for (const name of FORWARDED_REQUEST_HEADERS) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
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
    if (!responseHeaders.has('cache-control'))
      responseHeaders.set('cache-control', 'private, no-store');
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    if (error instanceof ApiError) return toErrorResponse(error);
    return toErrorResponse(
      new ApiError({ message: 'Backend unavailable', category: 'network', cause: error }),
    );
  }
};
