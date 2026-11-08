import 'server-only';
import { isApiError } from '@app/api-core';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

/**
 * 개발 전용 카카오 웹 로그인(삭제 예정): 쉘의 네이티브 SDK 없이 브라우저에서 실서버 로그인 흐름을 확인하는 장치
 * 서버 전용 `DEV_WEB_LOGIN=enabled`일 때만 동작(`NEXT_PUBLIC_`를 붙이지 않음), 운영 배포에는 이 변수 미설정
 * 인가 코드 → ID 토큰 교환은 서버(BFF)의 비밀값(REST API 키·클라이언트 시크릿) 사용, 이후는 기존 `POST /api/auth/login` 경로와 동일
 */
export const isDevWebLoginEnabled = () => process.env.DEV_WEB_LOGIN === 'enabled';

export const notFoundResponse = () => new NextResponse(null, { status: 404 });

const STATE_COOKIE = 'devKakaoState';
const NONCE_COOKIE = 'devKakaoNonce';
const COOKIE_PATH = '/api/dev/kakao';
const COOKIE_MAX_AGE_SECONDS = 300;
const AUTHORIZE_URL = 'https://kauth.kakao.com/oauth/authorize';
const TOKEN_URL = 'https://kauth.kakao.com/oauth/token';
/** 로그인 뒤 도착 주소: 가드(`AuthGate`)가 가입 상태에 맞는 화면으로 다시 보냄 */
const AFTER_LOGIN_PATH = '/bunch';

/** 인가 요청과 토큰 요청에 같은 값을 써야 하는 redirect URI(카카오 콘솔에 등록한 값과 정확히 같아야 함) */
export const callbackUrl = (request: NextRequest) =>
  `${request.nextUrl.origin}/api/dev/kakao/callback`;

export const readRestApiKey = () => process.env.KAKAO_REST_API_KEY ?? '';

export const buildAuthorizeUrl = ({
  clientId,
  redirectUri,
  state,
  nonce,
}: {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
}) => {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  // OpenID Connect: ID 토큰을 받으려면 openid scope와 재생 방지 nonce 필요
  url.searchParams.set('scope', 'openid');
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  return url;
};

/** 암호학적 난수(state·nonce) */
export const randomToken = () => crypto.randomUUID();

const cookieOptions = (request: NextRequest, maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' || request.nextUrl.protocol === 'https:',
  // 카카오에서 돌아오는 최상위 이동(GET)에는 실리고, 다른 사이트의 하위 요청에는 실리지 않음
  sameSite: 'lax' as const,
  path: COOKIE_PATH,
  maxAge,
});

export const setFlowCookies = (
  response: NextResponse,
  request: NextRequest,
  { state, nonce }: { state: string; nonce: string },
) => {
  response.cookies.set(STATE_COOKIE, state, cookieOptions(request, COOKIE_MAX_AGE_SECONDS));
  response.cookies.set(NONCE_COOKIE, nonce, cookieOptions(request, COOKIE_MAX_AGE_SECONDS));
};

export const clearFlowCookies = (response: NextResponse, request: NextRequest) => {
  response.cookies.set(STATE_COOKIE, '', cookieOptions(request, 0));
  response.cookies.set(NONCE_COOKIE, '', cookieOptions(request, 0));
};

export const readFlowCookies = (request: NextRequest) => ({
  state: request.cookies.get(STATE_COOKIE)?.value,
  nonce: request.cookies.get(NONCE_COOKIE)?.value,
});

const tokenResponseSchema = z.object({ id_token: z.string().min(1) });

/** 카카오 오류 코드(KOE…)만 화면에 내보냄: 응답 본문 전체나 토큰은 내보내지 않음 */
const kakaoErrorCode = (body: unknown) => {
  const code =
    typeof body === 'object' && body !== null && 'error_code' in body
      ? String(body.error_code)
      : '';
  return /^KOE\d+$/.test(code) ? code : 'token_exchange_failed';
};

export class DevLoginError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

/** 인가 코드를 ID 토큰으로 교환. 실패하면 화면에 보여도 되는 코드만 담아 던짐 */
export const exchangeCodeForIdToken = async ({
  code,
  redirectUri,
}: {
  code: string;
  redirectUri: string;
}) => {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: readRestApiKey(),
    redirect_uri: redirectUri,
    code,
  });
  // 클라이언트 시크릿을 켠 앱은 필수
  const secret = process.env.KAKAO_CLIENT_SECRET;
  if (secret) body.set('client_secret', secret);

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  const json: unknown = await response.json().catch(() => undefined);
  if (!response.ok) throw new DevLoginError(kakaoErrorCode(json));

  const parsed = tokenResponseSchema.safeParse(json);
  // OpenID Connect를 켜지 않았거나 scope가 빠지면 id_token이 오지 않음
  if (!parsed.success) throw new DevLoginError('no_id_token');
  return parsed.data.id_token;
};

/** 백엔드 로그인 실패는 서버 오류 코드(AUTH_009 등)만 화면에 내보냄(원인 파악용) */
export const backendErrorCode = (error: unknown) =>
  isApiError(error) && error.code && /^[A-Z]+_\d+$/.test(error.code)
    ? `backend_${error.code}`
    : 'backend_login_failed';

export const loginErrorRedirect = (request: NextRequest, code: string) => {
  const url = new URL('/login', request.nextUrl.origin);
  url.searchParams.set('devLoginError', code);
  const response = NextResponse.redirect(url);
  clearFlowCookies(response, request);
  return response;
};

export const afterLoginRedirect = (request: NextRequest) =>
  NextResponse.redirect(new URL(AFTER_LOGIN_PATH, request.nextUrl.origin));
