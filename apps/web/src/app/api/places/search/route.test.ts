// @vitest-environment node

import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const context = { params: Promise.resolve({}) };

const get = (query: string, cookie: string | null = 'accessToken=a-1') =>
  new NextRequest(`https://app.example.com/api/places/search${query}`, {
    headers: cookie ? { cookie } : {},
  });

const kakaoResponse = (keyword: unknown, address: unknown) =>
  vi.fn((input: URL) => {
    const body = input.pathname.endsWith('/keyword.json') ? keyword : address;
    return Promise.resolve(Response.json(body));
  });

beforeEach(() => {
  vi.stubEnv('KAKAO_REST_API_KEY', 'test-key');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('GET /api/places/search', () => {
  it('키워드 검색과 주소 검색 결과를 합쳐 provider·externalId·이름·주소만 돌려준다', async () => {
    const fetchMock = kakaoResponse(
      {
        documents: [
          {
            id: '1001',
            place_name: '여의도한강공원',
            address_name: '서울 영등포구 여의동로 330',
            road_address_name: '서울 영등포구 여의동로 330',
            x: '126.9',
            y: '37.5',
          },
        ],
      },
      {
        documents: [
          {
            address_name: '서울 영등포구 여의도동',
            road_address: null,
            x: '126.9',
            y: '37.5',
          },
        ],
      },
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(get('?q=여의도'), context);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({
      places: [
        {
          provider: 'kakao',
          externalId: '1001',
          name: '여의도한강공원',
          address: '서울 영등포구 여의동로 330',
        },
        {
          provider: 'kakao',
          externalId: 'address:서울 영등포구 여의도동',
          name: '서울 영등포구 여의도동',
          address: '서울 영등포구 여의도동',
        },
      ],
    });
    // 키는 카카오 요청 헤더로만 가고 좌표 필드는 응답에 없음
    const [firstUrl, firstInit] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(firstUrl.searchParams.get('query')).toBe('여의도');
    expect((firstInit.headers as Record<string, string>).Authorization).toBe('KakaoAK test-key');
  });

  it('도로명 주소가 있으면 주소 검색 결과의 주소로 쓴다', async () => {
    vi.stubGlobal(
      'fetch',
      kakaoResponse(
        { documents: [] },
        {
          documents: [
            {
              address_name: '서울 영등포구 여의도동 1',
              road_address: { address_name: '서울 영등포구 국제금융로 10' },
            },
          ],
        },
      ),
    );

    const body = (await (await GET(get('?q=여의도'), context)).json()) as {
      places: { address: string }[];
    };

    expect(body.places[0]?.address).toBe('서울 영등포구 국제금융로 10');
  });

  it('같은 장소는 한 번만 보인다', async () => {
    const doc = {
      id: '7',
      place_name: 'IFC몰',
      address_name: '서울 영등포구 국제금융로 10',
    };
    vi.stubGlobal('fetch', kakaoResponse({ documents: [doc, doc] }, { documents: [] }));

    const body = (await (await GET(get('?q=IFC'), context)).json()) as { places: unknown[] };

    expect(body.places).toHaveLength(1);
  });

  it('한쪽 검색이 실패해도 다른 쪽 결과를 돌려준다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: URL) =>
        Promise.resolve(
          input.pathname.endsWith('/keyword.json')
            ? Response.json({
                documents: [{ id: '1', place_name: '카페', address_name: '서울 어딘가' }],
              })
            : new Response('server error', { status: 500 }),
        ),
      ),
    );

    const response = await GET(get('?q=카페'), context);

    expect(response.status).toBe(200);
    expect(((await response.json()) as { places: unknown[] }).places).toHaveLength(1);
  });

  it('둘 다 실패하면 502이고 카카오 응답 내용은 노출하지 않는다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('secret detail', { status: 401 }))),
    );

    const response = await GET(get('?q=카페'), context);

    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain('secret');
  });

  it('로그인하지 않았으면 카카오를 부르지 않고 401', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(get('?q=여의도', null), context);

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('검색어가 없거나 2자 미만이거나 50자를 넘으면 카카오를 부르지 않고 400', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    for (const query of ['', '?q=', '?q=a', '?q=%20%20', `?q=${'가'.repeat(51)}`]) {
      const response = await GET(get(query), context);
      expect(response.status).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('키 환경 변수가 없으면 503', async () => {
    vi.stubEnv('KAKAO_REST_API_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await GET(get('?q=여의도'), context);

    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
