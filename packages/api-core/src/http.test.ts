import { describe, expect, it, vi } from 'vitest';
import { createHttpClient } from './http';

describe('createHttpClient', () => {
  it('resolves endpoint requests against the configured base URL', async () => {
    const fetchMock = vi.fn((_input: Request | URL | string, _init?: RequestInit) =>
      Promise.resolve(new Response(JSON.stringify({ id: 'member-1' }))),
    );
    const client = createHttpClient({ baseUrl: 'https://api.example.test/v1/' });

    await client.get('members/member-1', { fetch: fetchMock }).json();

    const request = fetchMock.mock.calls[0]?.[0];
    if (!(request instanceof Request)) throw new Error('Expected Ky to create a Request');

    expect(request.url).toBe('https://api.example.test/v1/members/member-1');
  });

  it('runs app-provided request hooks', async () => {
    const beforeRequest = vi.fn();
    const fetchMock = vi.fn((_input: Request | URL | string, _init?: RequestInit) =>
      Promise.resolve(new Response('{}')),
    );
    const client = createHttpClient({
      hooks: { beforeRequest: [beforeRequest] },
    });

    await client.get('https://api.example.test/health', { fetch: fetchMock }).json();

    expect(beforeRequest).toHaveBeenCalledOnce();
  });
});
