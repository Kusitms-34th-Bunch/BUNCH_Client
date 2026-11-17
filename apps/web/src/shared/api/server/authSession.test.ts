// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import { reissueOnce, requestLogin } from './authSession';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

// 요청 본문은 전송 뒤 읽을 수 없어 fetch 시점에 기록
const captureFetch = (data: unknown) => {
  const calls: { url: string; body: unknown }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (request: Request) => {
      calls.push({ url: request.url, body: await request.json() });
      return envelope(data);
    }),
  );
  return calls;
};

const envelope = (data: unknown) =>
  new Response(JSON.stringify({ success: true, data, error: null }), {
    headers: { 'content-type': 'application/json' },
  });

describe('requestLogin', () => {
  it('제공자 경로로 idToken·nonce를 보내고 envelope의 토큰 쌍을 돌려준다', async () => {
    vi.stubEnv('API_BASE_URL', 'https://backend.example.com/');
    const calls = captureFetch({ accessToken: 'a-1', refreshToken: 'r-1' });

    const tokens = await requestLogin({ provider: 'kakao', idToken: 'id', nonce: 'n' });

    expect(calls[0]).toEqual({
      url: 'https://backend.example.com/api/v1/auth/kakao/login',
      body: { idToken: 'id', nonce: 'n' },
    });
    expect(tokens).toEqual({ accessToken: 'a-1', refreshToken: 'r-1' });
  });

  it('Google은 nonce를 보내지 않는다', async () => {
    vi.stubEnv('API_BASE_URL', 'https://backend.example.com/');
    const calls = captureFetch({ accessToken: 'a-1', refreshToken: 'r-1' });

    await requestLogin({ provider: 'google', idToken: 'id', nonce: 'n' });

    expect(calls[0]?.body).toEqual({ idToken: 'id' });
  });
});

describe('reissueOnce', () => {
  it('같은 refresh 토큰의 동시 재발급은 한 번만 실행하고 결과를 공유한다', async () => {
    const reissue = vi.fn().mockResolvedValue({ accessToken: 'a-2', refreshToken: 'r-2' });

    const [first, second] = await Promise.all([
      reissueOnce('r-same', reissue),
      reissueOnce('r-same', reissue),
    ]);

    expect(reissue).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
  });

  it('성공 직후 도착한 같은 토큰 요청도 같은 결과를 받고, 잠시 뒤에는 다시 실행한다', async () => {
    vi.useFakeTimers();
    const reissue = vi.fn().mockResolvedValue({ accessToken: 'a-3', refreshToken: 'r-3' });

    await reissueOnce('r-late', reissue);
    await reissueOnce('r-late', reissue);
    expect(reissue).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(10_000);
    await reissueOnce('r-late', reissue);
    expect(reissue).toHaveBeenCalledTimes(2);
  });

  it('실패하면 결과를 남기지 않아 다음 요청이 다시 시도한다', async () => {
    const reissue = vi
      .fn()
      .mockRejectedValueOnce(new Error('401'))
      .mockResolvedValueOnce({ accessToken: 'a-4', refreshToken: 'r-4' });

    await expect(reissueOnce('r-fail', reissue)).rejects.toThrow('401');
    await expect(reissueOnce('r-fail', reissue)).resolves.toEqual({
      accessToken: 'a-4',
      refreshToken: 'r-4',
    });
  });
});
