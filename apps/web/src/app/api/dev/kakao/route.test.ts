// @vitest-environment node

import { ApiError } from '@app/api-core';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as authorize } from './authorize/route';
import { GET as callback } from './callback/route';

const session = vi.hoisted(() => ({ requestLogin: vi.fn() }));
vi.mock('@/shared/api/authSession', () => session);

const ORIGIN = 'http://localhost:3000';
const TOKENS = { accessToken: 'a.e30.s', refreshToken: 'r.e30.s' };
const REDIRECT_URI = `${ORIGIN}/api/dev/kakao/callback`;

const get = (path: string, cookie?: string) =>
  new NextRequest(`${ORIGIN}${path}`, { headers: cookie ? { cookie } : {} });

const flowCookie = (state = 'st-1', nonce = 'no-1') =>
  `devKakaoState=${state}; devKakaoNonce=${nonce}`;

const stubTokenExchange = (response: { ok: boolean; body: unknown }) => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok,
    json: () => Promise.resolve(response.body),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const redirectedTo = (response: Response) => new URL(response.headers.get('location') ?? '');

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('DEV_WEB_LOGIN', 'enabled');
  vi.stubEnv('KAKAO_REST_API_KEY', 'rest-key');
  vi.stubEnv('KAKAO_CLIENT_SECRET', 'client-secret');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('개발 전용 카카오 웹 로그인 비활성', () => {
  it('플래그가 꺼져 있으면 시작과 콜백 모두 404이고 아무것도 하지 않는다', async () => {
    vi.stubEnv('DEV_WEB_LOGIN', '');
    const fetchMock = stubTokenExchange({ ok: true, body: {} });

    expect(authorize(get('/api/dev/kakao/authorize')).status).toBe(404);
    expect(
      (await callback(get('/api/dev/kakao/callback?code=c&state=st-1', flowCookie()))).status,
    ).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(session.requestLogin).not.toHaveBeenCalled();
  });
});

describe('GET /api/dev/kakao/authorize', () => {
  it('state·nonce를 쿠키에 두고 openid scope로 카카오 인가 화면에 보낸다', () => {
    const response = authorize(get('/api/dev/kakao/authorize'));

    expect(response.status).toBe(307);
    const url = redirectedTo(response);
    expect(`${url.origin}${url.pathname}`).toBe('https://kauth.kakao.com/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('rest-key');
    expect(url.searchParams.get('redirect_uri')).toBe(REDIRECT_URI);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('openid');

    const state = response.cookies.get('devKakaoState');
    const nonce = response.cookies.get('devKakaoNonce');
    expect(state).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/api/dev/kakao' });
    expect(nonce).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/api/dev/kakao' });
    // 요청에 실은 값과 쿠키에 둔 값이 같고, 서로 다른 난수
    expect(url.searchParams.get('state')).toBe(state?.value);
    expect(url.searchParams.get('nonce')).toBe(nonce?.value);
    expect(state?.value).not.toBe(nonce?.value);
  });

  it('REST API 키가 없으면 안내와 함께 500이다', async () => {
    vi.stubEnv('KAKAO_REST_API_KEY', '');

    const response = authorize(get('/api/dev/kakao/authorize'));

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ code: 'DEV_LOGIN_NOT_CONFIGURED' });
  });
});

describe('GET /api/dev/kakao/callback', () => {
  it('인가 코드를 ID 토큰으로 교환해 기존 로그인 경로로 세션 쿠키를 발급하고 도착 화면으로 보낸다', async () => {
    const fetchMock = stubTokenExchange({ ok: true, body: { id_token: 'kakao-id-token' } });
    session.requestLogin.mockResolvedValue(TOKENS);

    const response = await callback(
      get('/api/dev/kakao/callback?code=auth-code&state=st-1', flowCookie()),
    );

    // 토큰 교환 요청: 서버가 REST API 키·시크릿·같은 redirect_uri로 보냄
    const [url, init] = fetchMock.mock.calls[0] as [string, { body: URLSearchParams }];
    expect(url).toBe('https://kauth.kakao.com/oauth/token');
    expect(Object.fromEntries(init.body)).toEqual({
      grant_type: 'authorization_code',
      client_id: 'rest-key',
      redirect_uri: REDIRECT_URI,
      code: 'auth-code',
      client_secret: 'client-secret',
    });

    expect(session.requestLogin).toHaveBeenCalledWith({
      provider: 'kakao',
      idToken: 'kakao-id-token',
      nonce: 'no-1',
    });
    expect(response.status).toBe(307);
    expect(redirectedTo(response).pathname).toBe('/bunch');
    expect(response.cookies.get('accessToken')).toMatchObject({
      value: TOKENS.accessToken,
      httpOnly: true,
    });
    expect(response.cookies.get('refreshToken')).toMatchObject({ httpOnly: true });
    // 한 번 쓴 state·nonce는 지움
    expect(response.cookies.get('devKakaoState')?.value).toBe('');
    expect(response.cookies.get('devKakaoNonce')?.value).toBe('');
  });

  it('클라이언트 시크릿을 쓰지 않는 앱이면 교환 요청에 client_secret을 싣지 않는다', async () => {
    vi.stubEnv('KAKAO_CLIENT_SECRET', '');
    const fetchMock = stubTokenExchange({ ok: true, body: { id_token: 'kakao-id-token' } });
    session.requestLogin.mockResolvedValue(TOKENS);

    await callback(get('/api/dev/kakao/callback?code=c&state=st-1', flowCookie()));

    const init = fetchMock.mock.calls[0]?.[1] as { body: URLSearchParams };
    expect(init.body.has('client_secret')).toBe(false);
  });

  it.each([
    ['state가 쿠키와 다르면', '/api/dev/kakao/callback?code=c&state=other', flowCookie()],
    ['state 쿠키가 없으면', '/api/dev/kakao/callback?code=c&state=st-1', undefined],
    ['인가 코드가 없으면', '/api/dev/kakao/callback?state=st-1', flowCookie()],
  ])(
    '%s 교환도 로그인도 하지 않고 오류와 함께 로그인 화면으로 돌려보낸다',
    async (_name, path, cookie) => {
      const fetchMock = stubTokenExchange({ ok: true, body: {} });

      const response = await callback(get(path, cookie));

      const url = redirectedTo(response);
      expect(url.pathname).toBe('/login');
      expect(url.searchParams.get('devLoginError')).toBe('invalid_state');
      expect(fetchMock).not.toHaveBeenCalled();
      expect(session.requestLogin).not.toHaveBeenCalled();
      expect(response.cookies.get('accessToken')).toBeUndefined();
    },
  );

  it('사용자가 동의하지 않았으면 그 사유를 알리고 돌아간다', async () => {
    const response = await callback(
      get('/api/dev/kakao/callback?error=access_denied&state=st-1', flowCookie()),
    );

    expect(redirectedTo(response).searchParams.get('devLoginError')).toBe('access_denied');
    expect(session.requestLogin).not.toHaveBeenCalled();
  });

  it('카카오가 토큰 교환을 거절하면 KOE 코드만 알린다(본문·시크릿은 알리지 않음)', async () => {
    stubTokenExchange({
      ok: false,
      body: { error: 'invalid_grant', error_code: 'KOE303', error_description: 'secret-detail' },
    });

    const response = await callback(get('/api/dev/kakao/callback?code=c&state=st-1', flowCookie()));

    const location = response.headers.get('location') ?? '';
    expect(redirectedTo(response).searchParams.get('devLoginError')).toBe('KOE303');
    expect(location).not.toContain('secret-detail');
    expect(location).not.toContain('client-secret');
    expect(session.requestLogin).not.toHaveBeenCalled();
  });

  it('ID 토큰이 오지 않으면(OpenID Connect 꺼짐 등) 그 사유를 알린다', async () => {
    stubTokenExchange({ ok: true, body: { access_token: 'only-access' } });

    const response = await callback(get('/api/dev/kakao/callback?code=c&state=st-1', flowCookie()));

    expect(redirectedTo(response).searchParams.get('devLoginError')).toBe('no_id_token');
    expect(session.requestLogin).not.toHaveBeenCalled();
  });

  it.each([
    [
      '서버 오류 코드 없이 상태만 있으면 상태를',
      new ApiError({ message: 'x', category: 'server', status: 500 }),
      'backend_http_500',
    ],
    [
      '네트워크 오류면 그 구분을',
      new ApiError({ message: 'x', category: 'network' }),
      'backend_network',
    ],
    ['알 수 없는 오류면 일반 구분을', new Error('boom'), 'backend_login_failed'],
  ])('백엔드 로그인이 실패했을 때 %s 알린다', async (_name, failure, expected) => {
    stubTokenExchange({ ok: true, body: { id_token: 'kakao-id-token' } });
    session.requestLogin.mockRejectedValue(failure);

    const response = await callback(get('/api/dev/kakao/callback?code=c&state=st-1', flowCookie()));

    expect(redirectedTo(response).searchParams.get('devLoginError')).toBe(expected);
    expect(response.cookies.get('accessToken')).toBeUndefined();
  });

  it('백엔드가 로그인을 거부하면 서버 오류 코드만 알리고 쿠키는 발급하지 않는다', async () => {
    stubTokenExchange({ ok: true, body: { id_token: 'kakao-id-token' } });
    session.requestLogin.mockRejectedValue(
      new ApiError({ message: 'error', category: 'auth', status: 401, code: 'AUTH_009' }),
    );

    const response = await callback(get('/api/dev/kakao/callback?code=c&state=st-1', flowCookie()));

    const url = redirectedTo(response);
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('devLoginError')).toBe('backend_AUTH_009');
    expect(response.cookies.get('accessToken')).toBeUndefined();
  });
});
