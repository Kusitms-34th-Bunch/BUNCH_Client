import type { NextRequest, NextResponse } from 'next/server';

export const ACCESS_TOKEN_COOKIE = 'accessToken';
export const REFRESH_TOKEN_COOKIE = 'refreshToken';
// refresh 쿠키는 재발급·로그아웃 Route Handler에만 전송
export const REFRESH_TOKEN_PATH = '/api/auth';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** JWT `exp`까지 남은 초(서명 검증 없이 payload만 읽음, 읽지 못하면 undefined) */
export const secondsUntilExpiry = (token: string, now = Date.now()): number | undefined => {
  const payload = token.split('.')[1];
  if (!payload) return undefined;

  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      exp?: unknown;
    };
    return typeof exp === 'number' ? Math.max(0, Math.floor(exp - now / 1000)) : undefined;
  } catch {
    return undefined;
  }
};

// 운영은 항상 Secure(TLS 종단 프록시 뒤 대응), 개발은 http 로컬·같은 망 실기기 주소에서도 저장되도록 요청 프로토콜 기준
const cookieOptions = (request: NextRequest, path: string, token?: string) => {
  const maxAge = token === undefined ? 0 : secondsUntilExpiry(token);
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || request.nextUrl.protocol === 'https:',
    sameSite: 'lax' as const,
    path,
    ...(maxAge === undefined ? {} : { maxAge }),
  };
};

/** 백엔드가 응답 본문으로 준 토큰을 httpOnly 쿠키로 발급(만료는 JWT `exp` 기준) */
export const setAuthCookies = (response: NextResponse, request: NextRequest, tokens: TokenPair) => {
  response.cookies.set(
    ACCESS_TOKEN_COOKIE,
    tokens.accessToken,
    cookieOptions(request, '/', tokens.accessToken),
  );
  response.cookies.set(
    REFRESH_TOKEN_COOKIE,
    tokens.refreshToken,
    cookieOptions(request, REFRESH_TOKEN_PATH, tokens.refreshToken),
  );
};

export const clearAuthCookies = (response: NextResponse, request: NextRequest) => {
  response.cookies.set(ACCESS_TOKEN_COOKIE, '', cookieOptions(request, '/'));
  response.cookies.set(REFRESH_TOKEN_COOKIE, '', cookieOptions(request, REFRESH_TOKEN_PATH));
};
