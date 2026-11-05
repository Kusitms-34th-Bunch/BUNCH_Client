// @vitest-environment node

import { ApiError } from '@app/api-core';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as login } from './login/route';
import { POST as logout } from './logout/route';
import { POST as reissue } from './reissue/route';

const session = vi.hoisted(() => ({
  requestLogin: vi.fn(),
  requestLogout: vi.fn(),
  reissueOnce: vi.fn(),
}));
vi.mock('@/shared/api/authSession', () => session);

const TOKENS = { accessToken: 'a.e30.s', refreshToken: 'r.e30.s' };

const post = (path: string, options: { body?: unknown; cookie?: string } = {}) =>
  new NextRequest(`https://app.example.com/api/auth/${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(options.cookie ? { cookie: options.cookie } : {}),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });

beforeEach(() => {
  vi.resetAllMocks();
});

describe('POST /api/auth/login', () => {
  it('백엔드 토큰을 httpOnly 쿠키로 저장하고 본문은 비운다', async () => {
    session.requestLogin.mockResolvedValue(TOKENS);

    const response = await login(
      post('login', { body: { provider: 'kakao', idToken: 'id', nonce: 'n' } }),
    );

    expect(response.status).toBe(204);
    expect(session.requestLogin).toHaveBeenCalledWith({
      provider: 'kakao',
      idToken: 'id',
      nonce: 'n',
    });
    expect(response.cookies.get('accessToken')).toMatchObject({
      value: TOKENS.accessToken,
      httpOnly: true,
    });
    expect(response.cookies.get('refreshToken')).toMatchObject({
      value: TOKENS.refreshToken,
      path: '/api/auth',
    });
  });

  it('Apple·Kakao에 nonce가 없거나 제공자가 다르면 400', async () => {
    expect(
      (await login(post('login', { body: { provider: 'apple', idToken: 'id' } }))).status,
    ).toBe(400);
    expect(
      (await login(post('login', { body: { provider: 'naver', idToken: 'id' } }))).status,
    ).toBe(400);
    expect(session.requestLogin).not.toHaveBeenCalled();
  });

  it('백엔드 오류는 상태와 코드를 그대로 전달한다', async () => {
    session.requestLogin.mockRejectedValue(
      new ApiError({ message: '소셜 검증 실패', category: 'auth', status: 401, code: 'AUTH_009' }),
    );

    const response = await login(post('login', { body: { provider: 'google', idToken: 'id' } }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: '소셜 검증 실패', code: 'AUTH_009' });
  });
});

describe('POST /api/auth/reissue', () => {
  it('refresh 쿠키로 재발급하고 두 쿠키를 교체한다', async () => {
    session.reissueOnce.mockResolvedValue(TOKENS);

    const response = await reissue(post('reissue', { cookie: 'refreshToken=old' }));

    expect(response.status).toBe(204);
    expect(session.reissueOnce).toHaveBeenCalledWith('old');
    expect(response.cookies.get('accessToken')?.value).toBe(TOKENS.accessToken);
  });

  it('refresh 쿠키가 없으면 백엔드를 부르지 않고 401', async () => {
    const response = await reissue(post('reissue'));

    expect(response.status).toBe(401);
    expect(session.reissueOnce).not.toHaveBeenCalled();
  });

  it('재발급이 401이어도 쿠키를 지우지 않는다(다른 탭이 먼저 교체한 새 쿠키 보호)', async () => {
    session.reissueOnce.mockRejectedValue(
      new ApiError({ message: '인증 필요', category: 'auth', status: 401, code: 'AUTH_001' }),
    );

    const response = await reissue(post('reissue', { cookie: 'refreshToken=old' }));

    expect(response.status).toBe(401);
    expect(response.cookies.get('accessToken')).toBeUndefined();
    expect(response.cookies.get('refreshToken')).toBeUndefined();
  });
});

describe('POST /api/auth/logout', () => {
  it('백엔드 로그아웃이 실패해도 쿠키를 지운다', async () => {
    session.requestLogout.mockRejectedValue(new Error('401'));

    const response = await logout(post('logout', { cookie: 'accessToken=a-1' }));

    expect(session.requestLogout).toHaveBeenCalledWith('a-1');
    expect(response.status).toBe(204);
    expect(response.cookies.get('accessToken')).toMatchObject({ value: '', maxAge: 0 });
    expect(response.cookies.get('refreshToken')).toMatchObject({ value: '', maxAge: 0 });
  });

  it('access 쿠키가 만료돼 없으면 refresh로 재발급한 access로 백엔드 세션을 폐기한다', async () => {
    session.reissueOnce.mockResolvedValue(TOKENS);
    session.requestLogout.mockResolvedValue(undefined);

    const response = await logout(post('logout', { cookie: 'refreshToken=old' }));

    expect(session.reissueOnce).toHaveBeenCalledWith('old');
    expect(session.requestLogout).toHaveBeenCalledWith(TOKENS.accessToken);
    expect(response.status).toBe(204);
  });

  it('access가 없고 재발급도 실패하면 백엔드를 부르지 않고 쿠키만 지운다', async () => {
    session.reissueOnce.mockRejectedValue(new Error('401'));

    const response = await logout(post('logout', { cookie: 'refreshToken=old' }));

    expect(session.requestLogout).not.toHaveBeenCalled();
    expect(response.status).toBe(204);
    expect(response.cookies.get('accessToken')).toMatchObject({ value: '', maxAge: 0 });
    expect(response.cookies.get('refreshToken')).toMatchObject({ value: '', maxAge: 0 });
  });

  it('쿠키가 하나도 없으면 백엔드를 부르지 않고 쿠키만 지운다', async () => {
    const response = await logout(post('logout'));

    expect(session.requestLogout).not.toHaveBeenCalled();
    expect(response.status).toBe(204);
  });
});
