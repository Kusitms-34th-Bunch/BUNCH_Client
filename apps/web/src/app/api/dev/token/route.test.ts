// @vitest-environment node

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const devToken = vi.hoisted(() => ({ requestDevToken: vi.fn() }));
vi.mock('@/shared/api/devToken', () => devToken);

const post = (body?: unknown) =>
  new NextRequest('http://localhost:3000/api/dev/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

beforeEach(() => {
  vi.resetAllMocks();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('POST /api/dev/token', () => {
  it('DEV_TOKEN_LOGIN이 켜져 있지 않으면 백엔드를 부르지 않고 404', async () => {
    const response = await POST(post({ nickname: 'dev' }));

    expect(response.status).toBe(404);
    expect(devToken.requestDevToken).not.toHaveBeenCalled();
  });

  it('운영 빌드에서는 변수가 켜져 있어도 404', async () => {
    vi.stubEnv('DEV_TOKEN_LOGIN', 'enabled');
    vi.stubEnv('NODE_ENV', 'production');

    expect((await POST(post({ nickname: 'dev' }))).status).toBe(404);
    expect(devToken.requestDevToken).not.toHaveBeenCalled();
  });

  it('켜져 있으면 닉네임으로 받은 access 토큰을 httpOnly 쿠키로만 저장하고 본문은 비운다', async () => {
    vi.stubEnv('DEV_TOKEN_LOGIN', 'enabled');
    devToken.requestDevToken.mockResolvedValue({ accessToken: 'a.e30.s' });

    const response = await POST(post({ nickname: ' dev ' }));

    expect(response.status).toBe(204);
    expect(devToken.requestDevToken).toHaveBeenCalledWith('dev');
    expect(response.cookies.get('accessToken')).toMatchObject({
      value: 'a.e30.s',
      httpOnly: true,
    });
    expect(response.cookies.get('refreshToken')).toBeUndefined();
  });

  it('닉네임이 비어 있으면 400', async () => {
    vi.stubEnv('DEV_TOKEN_LOGIN', 'enabled');

    expect((await POST(post({ nickname: '  ' }))).status).toBe(400);
    expect(devToken.requestDevToken).not.toHaveBeenCalled();
  });
});
