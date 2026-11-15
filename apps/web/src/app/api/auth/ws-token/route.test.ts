// @vitest-environment node

import { ApiError } from '@app/api-core';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const session = vi.hoisted(() => ({ requestWsToken: vi.fn() }));
vi.mock('@/shared/api/server/authSession', () => session);

const post = (cookie?: string) =>
  new NextRequest('https://app.example.com/api/auth/ws-token', {
    method: 'POST',
    headers: cookie ? { cookie } : {},
  });

const context = { params: Promise.resolve({}) };

beforeEach(() => {
  vi.resetAllMocks();
});

describe('POST /api/auth/ws-token', () => {
  it('access 쿠키로 연결용 토큰을 받아 캐시 없이 돌려준다', async () => {
    session.requestWsToken.mockResolvedValue({ token: 'ws-1', expiresAt: '2026-11-15T10:00:30Z' });

    const response = await POST(post('accessToken=a-1'), context);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ token: 'ws-1', expiresAt: '2026-11-15T10:00:30Z' });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(session.requestWsToken).toHaveBeenCalledWith('a-1');
  });

  it('로그인하지 않았으면 백엔드를 부르지 않고 401', async () => {
    const response = await POST(post(), context);

    expect(response.status).toBe(401);
    expect(session.requestWsToken).not.toHaveBeenCalled();
  });

  it('백엔드 오류는 상태와 코드를 그대로 전달하고 토큰은 담지 않는다', async () => {
    session.requestWsToken.mockRejectedValue(
      new ApiError({ message: '세션 만료', category: 'auth', status: 401, code: 'AUTH_001' }),
    );

    const response = await POST(post('accessToken=expired'), context);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: '세션 만료', code: 'AUTH_001' });
  });
});
