// @vitest-environment node

import { NextRequest, NextResponse } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  authCookieNames,
  clearAuthCookies,
  secondsUntilExpiry,
  setAuthCookies,
} from './authCookies';

afterEach(() => {
  vi.unstubAllEnvs();
});

const jwt = (payload: object) =>
  `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;

describe('secondsUntilExpiry', () => {
  it('JWT exp까지 남은 초를 돌려준다', () => {
    expect(secondsUntilExpiry(jwt({ exp: 1_000 }), 400_000)).toBe(600);
  });

  it('exp가 없거나 읽을 수 없으면 undefined', () => {
    expect(secondsUntilExpiry(jwt({ sub: '1' }))).toBeUndefined();
    expect(secondsUntilExpiry('not-a-jwt')).toBeUndefined();
  });
});

describe('setAuthCookies', () => {
  const tokens = {
    accessToken: jwt({ exp: Math.floor(Date.now() / 1000) + 60 }),
    refreshToken: jwt({ exp: Math.floor(Date.now() / 1000) + 120 }),
  };

  it('https에서는 httpOnly·Secure 쿠키, refresh는 인증 경로로 제한한다', () => {
    const response = new NextResponse(null);
    setAuthCookies(response, new NextRequest('https://app.example.com/api/auth/login'), tokens);

    const access = response.cookies.get('accessToken');
    const refresh = response.cookies.get('refreshToken');
    expect(access).toMatchObject({ httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
    expect(access?.maxAge).toBeGreaterThan(50);
    expect(refresh).toMatchObject({ httpOnly: true, secure: true, path: '/api/auth' });
    expect(refresh?.maxAge).toBeGreaterThan(110);
  });

  it('http 개발 주소(같은 망 실기기 포함)에서는 Secure를 붙이지 않는다', () => {
    const response = new NextResponse(null);
    setAuthCookies(response, new NextRequest('http://192.168.0.10:3000/api/auth/login'), tokens);

    expect(response.cookies.get('accessToken')?.secure).toBe(false);
  });

  it('운영에서는 프록시 뒤 http 요청이어도 Secure를 붙인다', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const response = new NextResponse(null);
    setAuthCookies(response, new NextRequest('http://internal:3000/api/auth/login'), tokens);

    expect(response.cookies.get('accessToken')?.secure).toBe(true);
  });
});

describe('clearAuthCookies', () => {
  it('두 쿠키를 같은 경로로 만료시킨다', () => {
    const response = new NextResponse(null);
    clearAuthCookies(response, new NextRequest('https://app.example.com/api/auth/logout'));

    expect(response.cookies.get('accessToken')).toMatchObject({ value: '', maxAge: 0, path: '/' });
    expect(response.cookies.get('refreshToken')).toMatchObject({
      value: '',
      maxAge: 0,
      path: '/api/auth',
    });
  });
});

describe('authCookieNames(#581)', () => {
  const staging = (userAgent: string) =>
    new NextRequest('https://app.example.com/api/auth/login', {
      headers: { 'user-agent': userAgent },
    });
  const tokens = {
    accessToken: jwt({ exp: Math.floor(Date.now() / 1000) + 60 }),
    refreshToken: jwt({ exp: Math.floor(Date.now() / 1000) + 120 }),
  };

  it('테스터용 쉘 요청은 _stg 쿠키를 쓰고 운영 쿠키는 건드리지 않는다', () => {
    vi.stubEnv('API_BASE_URL_STAGING', 'https://dev.example.com');
    const request = staging('Mozilla/5.0 (iPhone) BunchShell/staging');
    expect(authCookieNames(request)).toEqual({
      access: 'accessToken_stg',
      refresh: 'refreshToken_stg',
    });

    const response = new NextResponse(null);
    setAuthCookies(response, request, tokens);
    expect(response.cookies.get('accessToken_stg')?.value).toBe(tokens.accessToken);
    expect(response.cookies.get('accessToken')).toBeUndefined();
  });

  it('일반 요청이나 개발 주소가 없는 배포는 기존 쿠키 이름을 쓴다', () => {
    vi.stubEnv('API_BASE_URL_STAGING', 'https://dev.example.com');
    expect(authCookieNames(staging('Mozilla/5.0 (iPhone)')).access).toBe('accessToken');

    vi.stubEnv('API_BASE_URL_STAGING', '');
    expect(authCookieNames(staging('BunchShell/staging')).access).toBe('accessToken');
  });
});
