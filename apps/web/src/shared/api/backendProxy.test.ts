// @vitest-environment node

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { proxyToBackend, toBackendPath } from './backendProxy';

type Captured = { url: string; method: string; headers: Headers; body: string | undefined };

let captured: Captured[] = [];

const stubBackend = (response: Response | Error) => {
  captured = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: URL, init: RequestInit) => {
      captured.push({
        url: input.toString(),
        method: init.method ?? 'GET',
        headers: new Headers(init.headers),
        body: init.body ? new TextDecoder().decode(init.body as ArrayBuffer) : undefined,
      });
      return response instanceof Error ? Promise.reject(response) : Promise.resolve(response);
    }),
  );
};

const request = (
  path: string,
  init: {
    method?: string;
    cookie?: string;
    body?: string;
    contentType?: string;
  } = {},
) =>
  new NextRequest(`https://app.example.com/api/${path}`, {
    method: init.method ?? 'GET',
    headers: {
      ...(init.cookie ? { cookie: init.cookie } : {}),
      ...(init.contentType ? { 'content-type': init.contentType } : {}),
      accept: 'application/json',
    },
    ...(init.body === undefined ? {} : { body: init.body }),
  });

beforeEach(() => {
  vi.stubEnv('API_BASE_URL', 'https://backend.example.com/');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('toBackendPath', () => {
  it('BFF 경로 조각을 백엔드 /api/v1 경로로 바꾸고 조각은 인코딩한다', () => {
    expect(toBackendPath(['members', 'nickname-availability'])).toBe(
      'api/v1/members/nickname-availability',
    );
    expect(toBackendPath(['invitations', '번치 초대'])).toBe(
      'api/v1/invitations/%EB%B2%88%EC%B9%98%20%EC%B4%88%EB%8C%80',
    );
  });

  it('인증 경로·빈 경로·경로 조작 조각은 거부한다', () => {
    expect(toBackendPath([])).toBeUndefined();
    expect(toBackendPath(['auth', 'reissue'])).toBeUndefined();
    expect(toBackendPath(['members', '..', 'admin'])).toBeUndefined();
    expect(toBackendPath(['members', '.'])).toBeUndefined();
    expect(toBackendPath(['members', 'a/b'])).toBeUndefined();
    expect(toBackendPath(['members', 'a\\b'])).toBeUndefined();
    expect(toBackendPath(['members', 'a\nb'])).toBeUndefined();
  });
});

describe('proxyToBackend', () => {
  it('access 쿠키를 Bearer로 붙이고 브라우저 쿠키는 넘기지 않으며 쿼리스트링을 유지한다', async () => {
    stubBackend(
      new Response('{"success":true}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const response = await proxyToBackend(
      request('members/nickname-availability?nickname=%EB%B2%88%EC%B9%98', {
        cookie: 'accessToken=a-1; other=x',
      }),
      ['members', 'nickname-availability'],
    );

    expect(response.status).toBe(200);
    expect(captured[0]?.url).toBe(
      'https://backend.example.com/api/v1/members/nickname-availability?nickname=%EB%B2%88%EC%B9%98',
    );
    expect(captured[0]?.headers.get('authorization')).toBe('Bearer a-1');
    expect(captured[0]?.headers.get('cookie')).toBeNull();
    expect(captured[0]?.headers.get('accept')).toBe('application/json');
  });

  it('쿠키가 없으면 인증 헤더 없이 전달한다(공개 API)', async () => {
    stubBackend(new Response(null, { status: 200 }));

    await proxyToBackend(request('invitations/token-1'), ['invitations', 'token-1']);

    expect(captured[0]?.headers.get('authorization')).toBeNull();
  });

  it('본문과 content-type(multipart boundary 포함)을 그대로 전달한다', async () => {
    stubBackend(new Response(null, { status: 204 }));
    const contentType = 'multipart/form-data; boundary=abc';
    const body = '--abc\r\nContent-Disposition: form-data; name="photo"\r\n\r\nx\r\n--abc--';

    const response = await proxyToBackend(
      request('bunches/1/profile-image', {
        method: 'PUT',
        body,
        contentType,
        cookie: 'accessToken=a-1',
      }),
      ['bunches', '1', 'profile-image'],
    );

    expect(response.status).toBe(204);
    expect(captured[0]).toMatchObject({ method: 'PUT', body });
    expect(captured[0]?.headers.get('content-type')).toBe(contentType);
  });

  it('백엔드 상태·본문은 그대로, Set-Cookie 같은 헤더는 버린다', async () => {
    const envelope =
      '{"success":false,"data":null,"error":{"code":"AUTH_001","message":"인증 필요"}}';
    stubBackend(
      new Response(envelope, {
        status: 401,
        headers: {
          'content-type': 'application/json',
          'set-cookie': 'session=leak',
          'x-internal': '1',
        },
      }),
    );

    const response = await proxyToBackend(request('members/me/onboarding'), [
      'members',
      'me',
      'onboarding',
    ]);

    expect(response.status).toBe(401);
    expect(await response.text()).toBe(envelope);
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(response.headers.get('x-internal')).toBeNull();
  });

  it('거부한 경로는 백엔드를 부르지 않고 404', async () => {
    stubBackend(new Response(null));

    const response = await proxyToBackend(request('auth/reissue'), ['auth', 'reissue']);

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: 'BFF_NOT_FOUND' });
    expect(captured).toHaveLength(0);
  });

  it('백엔드 연결 실패는 502', async () => {
    stubBackend(new TypeError('fetch failed'));

    const response = await proxyToBackend(request('members/me/onboarding'), [
      'members',
      'me',
      'onboarding',
    ]);

    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ code: 'BFF_UPSTREAM_UNAVAILABLE' });
  });

  it('API_BASE_URL에 경로가 있고 끝 /가 없어도 그 경로 아래로 보낸다', async () => {
    vi.stubEnv('API_BASE_URL', 'https://backend.example.com/svc');
    stubBackend(new Response(null, { status: 200 }));

    await proxyToBackend(request('members/me/onboarding'), ['members', 'me', 'onboarding']);

    expect(captured[0]?.url).toBe('https://backend.example.com/svc/api/v1/members/me/onboarding');
  });

  it('백엔드가 Cache-Control을 주지 않으면 저장 금지를 기본으로 붙인다', async () => {
    stubBackend(
      new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
    );

    const response = await proxyToBackend(request('members/me/onboarding'), [
      'members',
      'me',
      'onboarding',
    ]);

    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
});
