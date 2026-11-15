import { normalizeError, parseOrThrow } from '@app/api-core';
import { z } from 'zod';
import { bffApi } from '@/shared/api/bffApi';
import type { PlaceResult } from '../lib/types';

const placeSearchSchema = z.object({
  places: z.array(
    z.object({
      provider: z.string().min(1),
      externalId: z.string().min(1),
      name: z.string().min(1),
      address: z.string(),
    }),
  ),
});

// 같은 검색어를 이 시간 동안은 BFF에 다시 묻지 않음(글자를 지웠다 다시 쓰는 흔한 경우의 호출을 줄임)
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 50;
const cache = new Map<string, { at: number; places: readonly PlaceResult[] }>();

/** 테스트에서 검색어 사이에 결과가 새지 않도록 캐시를 비움 */
export const clearPlaceSearchCache = () => cache.clear();

const cacheKey = (query: string) => query.trim().toLowerCase();

/**
 * 위치 검색: 웹 BFF(`GET /api/places/search`)가 카카오 로컬 키워드·주소 검색을 합쳐 돌려줌(키는 서버에만 있음)
 * 서버 백엔드에는 검색 API가 없고 BFF 응답은 envelope 없이 `{ places }`다. 오류는 ApiError로 던짐(검색 시트가 오류 토스트)
 */
export const searchPlaces = async (
  query: string,
  signal?: AbortSignal,
): Promise<readonly PlaceResult[]> => {
  const key = cacheKey(query);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at <= CACHE_TTL_MS) return hit.places;
  try {
    const body = parseOrThrow(
      placeSearchSchema,
      await bffApi
        .get('places/search', { searchParams: { q: query }, signal: signal ?? null })
        .json(),
      'place search',
    );
    const places = body.places.map((place) => ({
      id: `${place.provider}:${place.externalId}`,
      ...place,
    }));
    if (cache.size >= CACHE_MAX_ENTRIES) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(key, { at: Date.now(), places });
    return places;
  } catch (error) {
    throw normalizeError(error);
  }
};
