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
