// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServerApi } from './serverClient';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('createServerApi', () => {
  it('access 토큰을 Bearer로 붙이고 브라우저 쿠키는 넘기지 않는다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await createServerApi({ baseUrl: 'https://api.example.com/', accessToken: 'token-1' }).get(
      'me',
    );

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.headers.get('Authorization')).toBe('Bearer token-1');
    expect(request.headers.get('cookie')).toBeNull();
  });

  it('토큰이 없으면 인증 헤더 없이 호출한다(공개 API)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await createServerApi({ baseUrl: 'https://api.example.com/' }).get('invitations/abc');

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.headers.get('Authorization')).toBeNull();
  });

  it('주소를 주지 않으면 API_BASE_URL을 쓴다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('API_BASE_URL', 'https://backend.example.com/');

    await createServerApi().get('api/v1/auth/terms');

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe('https://backend.example.com/api/v1/auth/terms');
  });

  it('API_BASE_URL이 없으면 설정 오류를 던진다', () => {
    vi.stubEnv('API_BASE_URL', '');
    expect(() => createServerApi()).toThrow('API_BASE_URL이 설정되지 않았습니다.');
  });

  it('API_BASE_URL 끝에 /가 없어도 경로를 유지한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('API_BASE_URL', 'https://backend.example.com/svc');

    await createServerApi().get('api/v1/auth/terms');

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe('https://backend.example.com/svc/api/v1/auth/terms');
  });
});
