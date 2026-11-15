import 'server-only';
import { z } from 'zod';

const KAKAO_LOCAL_BASE = 'https://dapi.kakao.com/v2/local/search';
// 카카오가 응답하지 않을 때 검색 시트가 오래 멈추지 않도록 하는 상한
const KAKAO_TIMEOUT_MS = 5000;
const KEYWORD_SIZE = 15;
const ADDRESS_SIZE = 10;
const MAX_RESULTS = 15;

/** 위치 하나(백엔드 장소 행의 provider·externalId·name·address와 같은 모양) */
export type KakaoPlace = {
  provider: 'kakao';
  externalId: string;
  name: string;
  address: string;
};

// 응답에서 쓰는 필드만 검사(그 밖의 필드는 버림)
const keywordSchema = z.object({
  documents: z.array(
    z.object({
      id: z.string(),
      place_name: z.string(),
      address_name: z.string(),
      road_address_name: z.string().optional(),
    }),
  ),
});
const addressSchema = z.object({
  documents: z.array(
    z.object({
      address_name: z.string(),
      road_address: z.object({ address_name: z.string() }).nullish(),
    }),
  ),
});

/** 키가 없거나 카카오가 오류를 돌려줌(웹 BFF 오류로 바꿔 전달) */
export class PlaceSearchUnavailableError extends Error {}

const requestKakao = async <T>(
  kind: 'keyword' | 'address',
  query: string,
  size: number,
  schema: z.ZodType<T>,
  apiKey: string,
): Promise<T> => {
  const url = new URL(`${KAKAO_LOCAL_BASE}/${kind}.json`);
  url.searchParams.set('query', query);
  url.searchParams.set('size', String(size));
  const response = await fetch(url, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
    signal: AbortSignal.timeout(KAKAO_TIMEOUT_MS),
    cache: 'no-store',
  });
  if (!response.ok) throw new PlaceSearchUnavailableError(`kakao ${kind} ${response.status}`);
  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) throw new PlaceSearchUnavailableError(`kakao ${kind} schema`);
  return parsed.data;
};

/**
 * 카카오 로컬 키워드 검색과 주소 검색을 함께 불러 합친 위치 목록(키워드 결과가 먼저, 같은 장소는 한 번만)
 * 장소나 지역을 가르거나 막지 않고 검색 결과를 그대로 돌려줌. 좌표는 쓰지 않음(기능 spec 4.3.10)
 * 한쪽만 실패하면 다른 쪽 결과를 쓰고, 둘 다 실패하면 오류
 */
export const searchKakaoPlaces = async (query: string, apiKey: string): Promise<KakaoPlace[]> => {
  const [keyword, address] = await Promise.allSettled([
    requestKakao('keyword', query, KEYWORD_SIZE, keywordSchema, apiKey),
    requestKakao('address', query, ADDRESS_SIZE, addressSchema, apiKey),
  ]);
  if (keyword.status === 'rejected' && address.status === 'rejected') {
    throw new PlaceSearchUnavailableError('kakao search failed');
  }

  const places: KakaoPlace[] = [];
  if (keyword.status === 'fulfilled') {
    for (const doc of keyword.value.documents) {
      places.push({
        provider: 'kakao',
        externalId: doc.id,
        name: doc.place_name,
        // 도로명 주소가 있으면 그것을, 없으면 지번 주소를 보임
        address: doc.road_address_name?.trim() || doc.address_name,
      });
    }
  }
  if (address.status === 'fulfilled') {
    for (const doc of address.value.documents) {
      // 주소 검색에는 장소 id가 없어 주소 문자열로 구분함
      const roadName = doc.road_address?.address_name;
      places.push({
        provider: 'kakao',
        externalId: `address:${doc.address_name}`,
        name: doc.address_name,
        address: roadName && roadName !== doc.address_name ? roadName : doc.address_name,
      });
    }
  }

  const seen = new Set<string>();
  return places
    .filter((place) => {
      if (seen.has(place.externalId)) return false;
      seen.add(place.externalId);
      return true;
    })
    .slice(0, MAX_RESULTS);
};
