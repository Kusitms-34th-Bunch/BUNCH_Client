import { describe, expect, it } from 'vitest';

const UUID = 'b37d231c-5a60-4cf8-a83c-ae4b704154b7';
const URL_PATH = `/api/members/me/push-devices/${UUID}`;
const valid = {
  deviceToken: 'aabbccdd',
  environment: 'SANDBOX',
  authorizationStatus: 'AUTHORIZED',
};

type Envelope = { data?: Record<string, unknown> | null; error?: { code: string } };
const read = async (response: Response) => (await response.json()) as Envelope;
const put = (body: unknown, path = URL_PATH) =>
  fetch(path, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('푸시 기기 handler', () => {
  it('등록하면 설치 ID·환경·권한 상태·등록 시각을 돌려주고 토큰은 돌려주지 않는다', async () => {
    const response = await put(valid);
    const { data } = await read(response);

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      installationId: UUID,
      environment: 'SANDBOX',
      authorizationStatus: 'AUTHORIZED',
    });
    expect(typeof data?.registeredAt).toBe('string');
    expect(JSON.stringify(data)).not.toContain('aabbccdd');
  });

  it.each([
    ['UUID가 아닌 설치 ID', valid, '/api/members/me/push-devices/not-a-uuid', 'COMMON_001'],
    ['16진수가 아닌 토큰', { ...valid, deviceToken: 'xyz' }, URL_PATH, 'COMMON_001'],
    ['홀수 길이 토큰', { ...valid, deviceToken: 'abc' }, URL_PATH, 'COMMON_001'],
    ['모르는 환경', { ...valid, environment: 'STAGING' }, URL_PATH, 'COMMON_001'],
    ['모르는 권한 상태', { ...valid, authorizationStatus: 'GRANTED' }, URL_PATH, 'COMMON_001'],
    ['본문 없음', null, URL_PATH, 'COMMON_002'],
  ])('%s은 400이다', async (_name, body, path, code) => {
    const response = await put(body, path);

    expect(response.status).toBe(400);
    expect((await read(response)).error?.code).toBe(code);
  });

  it('해제는 멱등 성공이고, UUID가 아니면 400이다', async () => {
    expect((await fetch(URL_PATH, { method: 'DELETE' })).status).toBe(200);
    expect((await fetch(URL_PATH, { method: 'DELETE' })).status).toBe(200);
    expect((await fetch('/api/members/me/push-devices/nope', { method: 'DELETE' })).status).toBe(
      400,
    );
  });
});
