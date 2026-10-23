// @vitest-environment node

import { ApiError } from '@app/api-core';
import ky from 'ky';
import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';
import { createAuthorizedRoute } from './createAuthorizedRoute';

const makeRequest = (options: {
  cookie?: string;
  method?: string;
  body?: string;
  contentType?: string;
}) => {
  const headers = new Headers();
  if (options.cookie) headers.set('cookie', options.cookie);
  if (options.contentType) headers.set('content-type', options.contentType);

  return new NextRequest('https://example.com/api/x', {
    method: options.method ?? 'GET',
    headers,
    ...(options.body !== undefined ? { body: options.body } : {}),
  });
};

const noParams = { params: Promise.resolve({}) };

describe('createAuthorizedRoute', () => {
  it('returns 401 when the access token cookie is missing', async () => {
    const handler = vi.fn();
    const route = createAuthorizedRoute(handler);

    const response = await route(makeRequest({}), noParams);

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('calls the handler with the access token and returns its result as JSON', async () => {
    const handler = vi.fn().mockResolvedValue({ ok: true });
    const route = createAuthorizedRoute(handler);

    const response = await route(makeRequest({ cookie: 'accessToken=token-1' }), noParams);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'token-1', body: undefined }),
    );
  });

  it('parses a JSON body and passes it to the handler', async () => {
    const handler = vi.fn().mockResolvedValue({ ok: true });
    const route = createAuthorizedRoute(handler);

    await route(
      makeRequest({
        cookie: 'accessToken=token-1',
        method: 'POST',
        contentType: 'application/json',
        body: JSON.stringify({ name: 'a' }),
      }),
      noParams,
    );

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ body: { name: 'a' } }));
  });

  it('returns 400 for a malformed JSON body', async () => {
    const handler = vi.fn();
    const route = createAuthorizedRoute(handler);

    const response = await route(
      makeRequest({
        cookie: 'accessToken=token-1',
        method: 'POST',
        contentType: 'application/json',
        body: '{not json',
      }),
      noParams,
    );

    expect(response.status).toBe(400);
    expect(handler).not.toHaveBeenCalled();
  });

  it('returns 204 when the handler resolves to undefined', async () => {
    const route = createAuthorizedRoute(() => Promise.resolve(undefined));

    const response = await route(makeRequest({ cookie: 'accessToken=token-1' }), noParams);

    expect(response.status).toBe(204);
  });

  it('maps an ApiError thrown by the handler to its status', async () => {
    const route = createAuthorizedRoute(() => {
      throw new ApiError({ message: '권한이 없습니다', category: 'auth', status: 403 });
    });

    const response = await route(makeRequest({ cookie: 'accessToken=token-1' }), noParams);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ message: '권한이 없습니다', code: undefined });
  });

  it('maps an unknown error thrown by the handler to 500', async () => {
    const route = createAuthorizedRoute(() => {
      throw new Error('boom');
    });

    const response = await route(makeRequest({ cookie: 'accessToken=token-1' }), noParams);

    expect(response.status).toBe(500);
  });

  it('백엔드 HTTP 오류는 envelope의 코드와 상태를 그대로 전달한다(브라우저 재발급 판단용)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          data: null,
          error: { code: 'AUTH_001', message: '인증 필요' },
        }),
        { status: 401, headers: { 'content-type': 'application/json' } },
      ),
    );
    const route = createAuthorizedRoute(() =>
      ky.get('https://backend.example.com/api/v1/members/me/onboarding', { fetch: fetchMock }),
    );

    const response = await route(makeRequest({ cookie: 'accessToken=token-1' }), noParams);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: '인증 필요', code: 'AUTH_001' });
  });

  it('다른 사이트에서 온 상태 변경 요청은 handler를 부르지 않고 403, GET은 통과한다', async () => {
    const handler = vi.fn().mockResolvedValue({ ok: true });
    const route = createAuthorizedRoute(handler);
    const crossSite = (method: string) =>
      new NextRequest('https://example.com/api/x', {
        method,
        headers: { cookie: 'accessToken=token-1', 'sec-fetch-site': 'cross-site' },
      });

    const post = await route(crossSite('POST'), noParams);
    expect(post.status).toBe(403);
    expect(await post.json()).toMatchObject({ code: 'BFF_CROSS_SITE' });
    expect(handler).not.toHaveBeenCalled();

    const get = await route(crossSite('GET'), noParams);
    expect(get.status).toBe(200);
  });
});
