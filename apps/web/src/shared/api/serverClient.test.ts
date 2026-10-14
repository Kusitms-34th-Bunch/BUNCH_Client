// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServerApi } from './serverClient';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createServerApi', () => {
  it('forwards the cookie header when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const api = createServerApi({ baseUrl: 'https://api.example.com/', cookie: 'session=abc' });
    await api.get('me');

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.headers.get('cookie')).toBe('session=abc');
  });

  it('omits the cookie header when not provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const api = createServerApi({ baseUrl: 'https://api.example.com/' });
    await api.get('me');

    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.headers.get('cookie')).toBeNull();
  });
});
