// @vitest-environment node

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearPlaceSearchCache } from './kakaoPlaces';
import {
  clearPlaceSearchRateLimit,
  IP_LIMIT_PER_WINDOW,
  TOKEN_LIMIT_PER_WINDOW,
} from './placeSearchLimit';
import { GET } from './route';

// 위치 검색 BFF의 남용 방지: 사용자·IP별 호출 제한과 같은 검색어의 동시 요청 합치기

const context = { params: Promise.resolve({}) };

const get = (
  query: string,
  cookie = 'accessToken=a-1',
  extra: { ip?: string; signal?: AbortSignal } = {},
) =>
  new NextRequest(`https://app.example.com/api/places/search?q=${encodeURIComponent(query)}`, {
    headers: { cookie, ...(extra.ip ? { 'x-forwarded-for': extra.ip } : {}) },
    ...(extra.signal ? { signal: extra.signal } : {}),
  });

const emptyKakao = () => vi.fn(() => Promise.resolve(Response.json({ documents: [] })));

beforeEach(() => {
  vi.stubEnv('KAKAO_REST_API_KEY', 'test-key');
  clearPlaceSearchCache();
  clearPlaceSearchRateLimit();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('호출 제한', () => {
  it('같은 사용자(토큰)가 한도를 넘기면 429와 Retry-After를 돌려주고 카카오를 부르지 않는다', async () => {
    const fetchMock = emptyKakao();
    vi.stubGlobal('fetch', fetchMock);

    for (let index = 0; index < TOKEN_LIMIT_PER_WINDOW; index += 1) {
      expect((await GET(get(`검색${index}`), context)).status).toBe(200);
    }
    const callsBefore = fetchMock.mock.calls.length;
    const response = await GET(get('검색한도'), context);

    expect(response.status).toBe(429);
    expect(Number(response.headers.get('Retry-After'))).toBeGreaterThanOrEqual(1);
    expect(await response.json()).toMatchObject({ code: 'BFF_RATE_LIMITED' });
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
  });

  it('다른 사용자는 영향을 받지 않는다', async () => {
    vi.stubGlobal('fetch', emptyKakao());
    for (let index = 0; index < TOKEN_LIMIT_PER_WINDOW + 1; index += 1)
      await GET(get(`검색${index}`), context);

    const other = await GET(get('다른사용자', 'accessToken=b-2'), context);

    expect(other.status).toBe(200);
  });

  it('쿠키를 바꿔 가며 보내도 같은 IP는 IP 한도에서 막힌다', async () => {
    vi.stubGlobal('fetch', emptyKakao());
    for (let index = 0; index < IP_LIMIT_PER_WINDOW; index += 1) {
      const response = await GET(
        get('검색어', `accessToken=forged-${index}`, { ip: '203.0.113.7, 10.0.0.1' }),
        context,
      );
      expect(response.status).toBe(200);
    }

    const blocked = await GET(
      get('검색어', 'accessToken=forged-last', { ip: '203.0.113.7' }),
      context,
    );
    const otherIp = await GET(
      get('검색어', 'accessToken=forged-other', { ip: '198.51.100.9' }),
      context,
    );

    expect(blocked.status).toBe(429);
    expect(otherIp.status).toBe(200);
  });

  it('IP 모양이 아닌 헤더 값은 키로 쓰지 않고 한 묶음으로 센다', async () => {
    vi.stubGlobal('fetch', emptyKakao());
    for (let index = 0; index < IP_LIMIT_PER_WINDOW; index += 1) {
      const response = await GET(
        get('검색어', `accessToken=forged-${index}`, {
          ip: `not-an-ip-${index}-${'x'.repeat(200)}`,
        }),
        context,
      );
      expect(response.status).toBe(200);
    }

    // 헤더를 매번 다른 문자열로 채워도 한 묶음('unknown')으로 세어 막힘
    const blocked = await GET(
      get('검색어', 'accessToken=forged-last', { ip: 'another-garbage' }),
      context,
    );
    expect(blocked.status).toBe(429);
  });

  it('잘못된 검색어를 반복해도 호출 수에 셈한다', async () => {
    vi.stubGlobal('fetch', emptyKakao());
    for (let index = 0; index < TOKEN_LIMIT_PER_WINDOW; index += 1) {
      expect((await GET(get('a'), context)).status).toBe(400);
    }

    expect((await GET(get('a'), context)).status).toBe(429);
  });
});

describe('같은 검색어의 동시 요청', () => {
  // 응답을 직접 풀 때까지 기다리게 하고, 취소 신호를 따르는 카카오 호출 대역(키워드 5건이라 주소 검색은 부르지 않음)
  const pendingKakao = () => {
    const resolvers: (() => void)[] = [];
    const signals: AbortSignal[] = [];
    const fetchMock = vi.fn((input: URL, init?: RequestInit) => {
      const signal = init?.signal;
      if (signal) signals.push(signal);
      return new Promise<Response>((resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
        resolvers.push(() =>
          resolve(
            Response.json(
              input.pathname.endsWith('/keyword.json')
                ? {
                    documents: Array.from({ length: 5 }, (_, index) => ({
                      id: String(index),
                      place_name: `장소${index}`,
                      address_name: '주소',
                    })),
                  }
                : { documents: [] },
            ),
          ),
        );
      });
    });
    return { fetchMock, signals, release: () => resolvers.splice(0).forEach((run) => run()) };
  };
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('카카오 호출 하나를 함께 기다리고 둘 다 같은 결과를 받는다', async () => {
    const { fetchMock, release } = pendingKakao();
    vi.stubGlobal('fetch', fetchMock);

    const first = GET(get('여의도', 'accessToken=a-1'), context);
    const second = GET(get('여의도', 'accessToken=b-2'), context);
    await tick();
    release();

    const [one, two] = await Promise.all([first, second]);
    expect(one.status).toBe(200);
    expect(await one.json()).toEqual(await two.json());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('한 요청이 취소돼도 함께 기다리는 다른 요청은 결과를 받는다', async () => {
    const { fetchMock, signals, release } = pendingKakao();
    vi.stubGlobal('fetch', fetchMock);
    const cancel = new AbortController();

    const first = GET(get('여의도', 'accessToken=a-1', { signal: cancel.signal }), context);
    const second = GET(get('여의도', 'accessToken=b-2'), context);
    await tick();
    cancel.abort();
    expect(signals[0]?.aborted).toBe(false);
    release();

    expect((await second).status).toBe(200);
    await first;
  });

  it('기다리는 요청이 모두 취소되면 카카오 호출도 끊는다', async () => {
    const { fetchMock, signals } = pendingKakao();
    vi.stubGlobal('fetch', fetchMock);
    const one = new AbortController();
    const two = new AbortController();

    const first = GET(get('여의도', 'accessToken=a-1', { signal: one.signal }), context);
    const second = GET(get('여의도', 'accessToken=b-2', { signal: two.signal }), context);
    await tick();
    one.abort();
    expect(signals[0]?.aborted).toBe(false);
    two.abort();

    expect(signals[0]?.aborted).toBe(true);
    expect((await first).status).toBe(502);
    expect((await second).status).toBe(502);
  });

  it('모두 취소돼 끊긴 호출에는 합류하지 않고 새로 시작해 결과를 받는다', async () => {
    const { fetchMock, release } = pendingKakao();
    vi.stubGlobal('fetch', fetchMock);
    const cancel = new AbortController();

    const first = GET(get('여의도', 'accessToken=a-1', { signal: cancel.signal }), context);
    await tick();
    cancel.abort();
    // 끊긴 호출이 아직 정리되기 전에 같은 검색어가 다시 들어옴(입력을 바꿨다 되돌린 경우)
    const second = GET(get('여의도', 'accessToken=b-2'), context);
    await tick();
    release();

    expect((await second).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await first;
  });

  it('호출이 끝난 뒤에는 같은 검색어도 새로 시작한다(실패는 캐시하지 않음)', async () => {
    const failing = vi.fn(() => Promise.resolve(new Response('error', { status: 500 })));
    vi.stubGlobal('fetch', failing);
    expect((await GET(get('여의도'), context)).status).toBe(502);
    const callsAfterFirst = failing.mock.calls.length;

    expect((await GET(get('여의도'), context)).status).toBe(502);
    expect(failing.mock.calls.length).toBeGreaterThan(callsAfterFirst);
  });
});
