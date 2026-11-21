import { normalizeError } from '@app/api-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBrowserApi } from './browserClient';

afterEach(() => {
  vi.unstubAllGlobals();
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('createBrowserApi', () => {
  it('토큰 헤더 없이 BFF를 호출한다(토큰은 httpOnly 쿠키)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({}));
    vi.stubGlobal('fetch', fetchMock);

    await createBrowserApi({ baseUrl: 'https://app.example.com/api/' }).get('users');

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.url).toBe('https://app.example.com/api/users');
    expect(request.headers.get('Authorization')).toBeNull();
  });

  it('401이면 세션을 한 번 재발급하고 다시 요청한다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({}, 401))
      .mockResolvedValueOnce(json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const refreshSession = vi.fn().mockResolvedValue(true);

    const api = createBrowserApi({ baseUrl: 'https://app.example.com/api/', refreshSession });

    expect(await api.get('users').json()).toEqual({ ok: true });
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('동시에 401을 받은 요청들은 재발급을 한 번만 한다', async () => {
    const counts = new Map<string, number>();
    vi.stubGlobal(
      'fetch',
      vi.fn((request: Request) => {
        const path = new URL(request.url).pathname;
        const count = (counts.get(path) ?? 0) + 1;
        counts.set(path, count);
        return Promise.resolve(count === 1 ? json({}, 401) : json({ ok: true }));
      }),
    );
    const refreshSession = vi
      .fn()
      .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(true), 5)));

    const api = createBrowserApi({ baseUrl: 'https://app.example.com/api/', refreshSession });
    const [a, b] = await Promise.all([api.get('a').json(), api.get('b').json()]);

    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it('재발급이 실패하면 onUnauthorized를 부르고 401을 그대로 전달한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 401)));
    const onUnauthorized = vi.fn();

    const api = createBrowserApi({
      baseUrl: 'https://app.example.com/api/',
      refreshSession: () => Promise.resolve(false),
      onUnauthorized,
    });

    await expect(api.get('users')).rejects.toMatchObject({ response: { status: 401 } });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('인증 경로 자체의 401은 재발급하지 않는다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({}, 401));
    vi.stubGlobal('fetch', fetchMock);
    const refreshSession = vi.fn();

    const api = createBrowserApi({ baseUrl: 'https://app.example.com/api/', refreshSession });

    await expect(api.post('auth/login')).rejects.toMatchObject({ response: { status: 401 } });
    expect(refreshSession).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('401이 아닌 오류(네트워크 등)는 재시도하지 않는다(POST 중복 전송 방지)', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    const api = createBrowserApi({
      baseUrl: 'https://app.example.com/api/',
      refreshSession: vi.fn(),
    });

    await expect(api.post('bunches')).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('기본 재발급은 실패해도 세션이 살아 있으면(다른 탭이 갱신) 성공으로 보고 재시도한다', async () => {
    const paths: string[] = [];
    let usersCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((input: Request | string) => {
        const path = new URL(
          typeof input === 'string' ? input : input.url,
          'https://app.example.com',
        ).pathname;
        paths.push(path);
        if (path === '/api/auth/reissue') return Promise.resolve(json({}, 401));
        if (path === '/api/session') return Promise.resolve(json({ authenticated: true }));
        usersCalls += 1;
        return Promise.resolve(usersCalls === 1 ? json({}, 401) : json({ ok: true }));
      }),
    );
    const onUnauthorized = vi.fn();

    const api = createBrowserApi({ baseUrl: 'https://app.example.com/api/', onUnauthorized });

    expect(await api.get('users').json()).toEqual({ ok: true });
    expect(paths).toEqual(['/api/users', '/api/auth/reissue', '/api/session', '/api/users']);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('재발급이 세션 없음(쿠키가 하나도 없음)이면 세션을 확인하지 않고 비로그인으로 끝낸다', async () => {
    const paths: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((input: Request | string) => {
        const path = new URL(
          typeof input === 'string' ? input : input.url,
          'https://app.example.com',
        ).pathname;
        paths.push(path);
        if (path === '/api/auth/reissue') {
          return Promise.resolve(json({ code: 'BFF_NO_SESSION' }, 401));
        }
        return Promise.resolve(json({}, 401));
      }),
    );
    const onUnauthorized = vi.fn();

    const api = createBrowserApi({ baseUrl: 'https://app.example.com/api/', onUnauthorized });

    await expect(api.get('users')).rejects.toMatchObject({ response: { status: 401 } });
    expect(paths).toEqual(['/api/users', '/api/auth/reissue']);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('같은 /api/auth/ 아래여도 약관 API의 401은 재발급 뒤 재시도한다(로그인·재발급·로그아웃만 제외)', async () => {
    const paths: string[] = [];
    let termsCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((input: Request | string) => {
        const path = new URL(
          typeof input === 'string' ? input : input.url,
          'https://app.example.com',
        ).pathname;
        paths.push(path);
        if (path === '/api/auth/reissue') return Promise.resolve(json({}));
        termsCalls += 1;
        return Promise.resolve(termsCalls === 1 ? json({}, 401) : json({ ok: true }));
      }),
    );

    const api = createBrowserApi({ baseUrl: 'https://app.example.com/api/' });

    expect(await api.get('auth/terms').json()).toEqual({ ok: true });
    expect(paths).toEqual(['/api/auth/terms', '/api/auth/reissue', '/api/auth/terms']);
  });

  it('재발급은 됐지만 재시도도 401이면 onUnauthorized를 부른다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => Promise.resolve(json({}, 401))),
    );
    const onUnauthorized = vi.fn();

    const api = createBrowserApi({
      baseUrl: 'https://app.example.com/api/',
      refreshSession: () => Promise.resolve(true),
      onUnauthorized,
    });

    await expect(api.get('users')).rejects.toMatchObject({ response: { status: 401 } });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});

/** 원래 요청은 첫 번째에 401, 재발급(`/api/auth/reissue`)·세션 확인(`/api/session`)은 주어진 대로 응답 */
const stubReissue = (
  reissue: () => Promise<Response>,
  session = () => Promise.resolve(json({}, 401)),
) => {
  const paths: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: Request | string) => {
      const path = new URL(typeof input === 'string' ? input : input.url, 'https://app.example.com')
        .pathname;
      paths.push(path);
      if (path === '/api/auth/reissue') return reissue();
      if (path === '/api/session') return session();
      return Promise.resolve(json({ code: 'AUTH_001' }, 401));
    }),
  );
  return paths;
};

/** 실패한 요청의 오류를 화면이 받는 모양(`ApiError`)으로 */
const failureOf = async (request: Promise<unknown>) => {
  try {
    await request;
  } catch (error) {
    return normalizeError(error);
  }
  throw new Error('요청이 성공했습니다.');
};

describe('createBrowserApi 재발급 실패 구분', () => {
  it('재발급이 일시 장애(502)면 인증 만료가 아니라 서버 오류로 전달하고 다시 보내지 않는다', async () => {
    const paths = stubReissue(() =>
      Promise.resolve(json({ message: 'upstream', code: 'BFF_UPSTREAM_UNAVAILABLE' }, 502)),
    );
    const onUnauthorized = vi.fn();
    const api = createBrowserApi({ baseUrl: 'https://app.example.com/api/', onUnauthorized });

    const error = await failureOf(api.post('bunches'));

    expect(error).toMatchObject({
      category: 'server',
      status: 502,
      code: 'BFF_UPSTREAM_UNAVAILABLE',
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
    // 다른 탭 갱신 확인은 인증 실패일 때만, 원래 POST는 한 번만
    expect(paths).toEqual(['/api/bunches', '/api/auth/reissue']);
  });

  it('재발급이 네트워크 오류면 네트워크 오류로 전달한다', async () => {
    const paths = stubReissue(() => Promise.reject(new TypeError('Failed to fetch')));
    const onUnauthorized = vi.fn();
    const api = createBrowserApi({ baseUrl: 'https://app.example.com/api/', onUnauthorized });

    const error = await failureOf(api.get('users'));

    expect(error).toMatchObject({ category: 'network' });
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(paths).toEqual(['/api/users', '/api/auth/reissue']);
  });

  it('재발급 응답이 시간 안에 오지 않으면 네트워크 오류로 전달한다', async () => {
    stubReissue(() => Promise.reject(new DOMException('signal timed out', 'TimeoutError')));
    const onUnauthorized = vi.fn();
    const api = createBrowserApi({ baseUrl: 'https://app.example.com/api/', onUnauthorized });

    const error = await failureOf(api.get('users'));

    expect(error).toMatchObject({ category: 'network' });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it.each([
    [401, { code: 'AUTH_001' }],
    [403, { code: 'AUTH_002' }],
    // 백엔드가 무효 토큰을 401이 아닌 4xx로 거절하는 경우(Swagger에 재발급 오류 정의 없음)
    [400, { code: 'COMMON_001' }],
    // BFF가 응답 형식 오류를 바꾼 500(무효 토큰일 수 있음)
    [500, { message: 'Internal Server Error' }],
  ])(
    '재발급이 %i이고 다른 탭도 갱신하지 않았으면 지금처럼 인증 만료로 끝난다',
    async (status, body) => {
      const paths = stubReissue(() => Promise.resolve(json(body, status)));
      const onUnauthorized = vi.fn();
      const api = createBrowserApi({ baseUrl: 'https://app.example.com/api/', onUnauthorized });

      const error = await failureOf(api.get('users'));

      expect(error).toMatchObject({ category: 'auth', status: 401 });
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
      expect(paths).toEqual(['/api/users', '/api/auth/reissue', '/api/session']);
    },
  );
});
