import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/server';
import { clearPlaceSearchCache, searchPlaces } from './places';

let requests: string[] = [];

beforeEach(() => {
  clearPlaceSearchCache();
  requests = [];
  server.use(
    http.get('/api/places/search', ({ request }) => {
      requests.push(new URL(request.url).searchParams.get('q') ?? '');
      return HttpResponse.json({
        places: [{ provider: 'kakao', externalId: '1', name: '여의도한강공원', address: '서울' }],
      });
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('searchPlaces', () => {
  it('BFF 결과에 목록에서 구분할 id(provider:externalId)를 붙인다', async () => {
    const places = await searchPlaces('여의도');

    expect(places).toEqual([
      {
        id: 'kakao:1',
        provider: 'kakao',
        externalId: '1',
        name: '여의도한강공원',
        address: '서울',
      },
    ]);
  });

  it('같은 검색어는 잠깐 재사용해 BFF를 다시 부르지 않고, 다른 검색어는 새로 부른다', async () => {
    await searchPlaces('여의도');
    await searchPlaces(' 여의도 ');
    await searchPlaces('여의도역');

    expect(requests).toEqual(['여의도', '여의도역']);
  });

  it('시간이 지나면 같은 검색어도 다시 부른다', async () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(1_000);
    await searchPlaces('여의도');

    now.mockReturnValue(1_000 + 5 * 60 * 1000 + 1);
    await searchPlaces('여의도');

    expect(requests).toEqual(['여의도', '여의도']);
  });

  it('일부 검색이 실패한 결과(degraded)는 캐시하지 않아 다음에 다시 묻는다', async () => {
    server.use(
      http.get('/api/places/search', ({ request }) => {
        requests.push(new URL(request.url).searchParams.get('q') ?? '');
        return HttpResponse.json({ places: [], degraded: true });
      }),
    );

    await searchPlaces('여의도');
    await searchPlaces('여의도');

    expect(requests).toEqual(['여의도', '여의도']);
  });

  it('실패한 응답은 캐시하지 않는다', async () => {
    server.use(http.get('/api/places/search', () => HttpResponse.json({}, { status: 502 })));
    await expect(searchPlaces('여의도')).rejects.toBeTruthy();

    server.use(
      http.get('/api/places/search', () => {
        requests.push('retry');
        return HttpResponse.json({ places: [] });
      }),
    );
    await searchPlaces('여의도');

    expect(requests).toEqual(['retry']);
  });
});
