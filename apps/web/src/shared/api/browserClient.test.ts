import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBrowserApi } from './browserClient';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createBrowserApi', () => {
  it('attaches the access token to outgoing requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const api = createBrowserApi({
      baseUrl: 'https://api.example.com/',
      getAccessToken: () => 'token-1',
      refreshAccessToken: vi.fn(),
    });

    await api.get('users');

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.headers.get('Authorization')).toBe('Bearer token-1');
  });

  it('refreshes the token once and retries after a 401', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const refreshAccessToken = vi.fn<() => Promise<string>>().mockResolvedValue('token-2');
    let currentToken = 'token-1';

    const api = createBrowserApi({
      baseUrl: 'https://api.example.com/',
      getAccessToken: () => currentToken,
      refreshAccessToken: async () => {
        currentToken = await refreshAccessToken();
        return currentToken;
      },
    });

    const result = await api.get('users').json();

    expect(result).toEqual({ ok: true });
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    const secondRequest = fetchMock.mock.calls[1]?.[0] as Request;
    expect(secondRequest.headers.get('Authorization')).toBe('Bearer token-2');
  });

  it('deduplicates refreshes when concurrent requests hit 401 at once', async () => {
    const callCounts = new Map<string, number>();
    const fetchMock = vi.fn((input: Request) => {
      const path = new URL(input.url).pathname;
      const count = (callCounts.get(path) ?? 0) + 1;
      callCounts.set(path, count);

      if (count === 1) return Promise.resolve(new Response('{}', { status: 401 }));
      return Promise.resolve(new Response('{"ok":true}', { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const refreshAccessToken = vi
      .fn<() => Promise<string>>()
      .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve('token-2'), 5)));
    let currentToken = 'token-1';

    const api = createBrowserApi({
      baseUrl: 'https://api.example.com/',
      getAccessToken: () => currentToken,
      refreshAccessToken: async () => {
        currentToken = await refreshAccessToken();
        return currentToken;
      },
    });

    const [a, b] = await Promise.all([api.get('a').json(), api.get('b').json()]);

    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
  });

  it('calls onUnauthorized when the refresh fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);

    const onUnauthorized = vi.fn();
    const api = createBrowserApi({
      baseUrl: 'https://api.example.com/',
      getAccessToken: () => 'token-1',
      refreshAccessToken: () => Promise.resolve(undefined),
      onUnauthorized,
    });

    await expect(api.get('users')).rejects.toThrow();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
