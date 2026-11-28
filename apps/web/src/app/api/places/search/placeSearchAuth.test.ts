// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPlaceSearchAuth,
  isSignedIn,
  PlaceSearchAuthUnavailableError,
} from './placeSearchAuth';

const headers = vi.hoisted(() => vi.fn(() => Promise.resolve(new Headers())));
vi.mock('next/headers', () => ({ headers }));

const backend = (status: number) =>
  vi.fn((_input: Request) => Promise.resolve(Response.json({}, { status })));

beforeEach(() => {
  vi.stubEnv('API_BASE_URL', 'https://api.example.com');
  clearPlaceSearchAuth();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('isSignedIn', () => {
  it('백엔드가 그 토큰으로 내 정보를 돌려주면 로그인으로 보고, 잠시 동안은 다시 묻지 않는다', async () => {
    const fetchMock = backend(200);
    vi.stubGlobal('fetch', fetchMock);

    await expect(isSignedIn('token-1')).resolves.toBe(true);
    await expect(isSignedIn('token-1')).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = fetchMock.mock.calls[0]![0];
    expect(request.url).toBe('https://api.example.com/api/v1/members/me');
    expect(request.headers.get('authorization')).toBe('Bearer token-1');
  });

  it('백엔드가 401로 거절하면 로그인이 아니고, 거절은 기억하지 않는다', async () => {
    const fetchMock = backend(401);
    vi.stubGlobal('fetch', fetchMock);

    await expect(isSignedIn('forged')).resolves.toBe(false);
    await expect(isSignedIn('forged')).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([500, 403])(
    '백엔드가 %i면(장애·명세에 뜻이 없는 거절) 로그인 여부를 정하지 않고 일시 장애로 알리며 다시 보내지 않는다',
    async (status) => {
      const fetchMock = backend(status);
      vi.stubGlobal('fetch', fetchMock);

      await expect(isSignedIn('token-1')).rejects.toBeInstanceOf(PlaceSearchAuthUnavailableError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );
});
