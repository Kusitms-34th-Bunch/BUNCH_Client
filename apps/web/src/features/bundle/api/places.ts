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

/**
 * 위치 검색: 웹 BFF(`GET /api/places/search`)가 카카오 로컬 키워드·주소 검색을 합쳐 돌려줌(키는 서버에만 있음)
 * 서버 백엔드에는 검색 API가 없고 BFF 응답은 envelope 없이 `{ places }`다. 오류는 ApiError로 던짐(검색 시트가 오류 토스트)
 */
export const searchPlaces = async (
  query: string,
  signal?: AbortSignal,
): Promise<readonly PlaceResult[]> => {
  try {
    const body = parseOrThrow(
      placeSearchSchema,
      await bffApi
        .get('places/search', { searchParams: { q: query }, signal: signal ?? null })
        .json(),
      'place search',
    );
    return body.places.map((place) => ({
      id: `${place.provider}:${place.externalId}`,
      ...place,
    }));
  } catch (error) {
    throw normalizeError(error);
  }
};
