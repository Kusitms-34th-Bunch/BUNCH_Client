import 'server-only';
import { z } from 'zod';

const KAKAO_LOCAL_BASE = 'https://dapi.kakao.com/v2/local/search';
// 카카오가 응답하지 않을 때 검색 시트가 오래 멈추지 않도록 하는 상한
const KAKAO_TIMEOUT_MS = 5000;
const KEYWORD_SIZE = 15;
const ADDRESS_SIZE = 10;
const MAX_RESULTS = 15;
// 키워드 검색 결과가 이 건수보다 적을 때만 주소 검색을 함께 부름(장소 이름 검색은 호출 1건, 주소·지역 검색은 2건)
export const ADDRESS_SEARCH_BELOW = 5;
// 같은 검색어를 이 시간 동안은 카카오에 다시 묻지 않음(서버 인스턴스마다 따로 보관하는 최선 노력 캐시)
const CACHE_TTL_MS = 3 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;

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

type CacheEntry = { at: number; places: KakaoPlace[] };
const cache = new Map<string, CacheEntry>();

/** 테스트에서 검색어 사이에 결과가 새지 않도록 캐시를 비움 */
export const clearPlaceSearchCache = () => {
  cache.clear();
  flights.clear();
};

// 대소문자·앞뒤 공백 차이로 같은 검색어를 다시 묻지 않도록 키를 맞춤
const cacheKey = (query: string) => query.trim().toLowerCase();

const readCache = (query: string): KakaoPlace[] | undefined => {
  const entry = cache.get(cacheKey(query));
  if (!entry) return undefined;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(cacheKey(query));
    return undefined;
  }
  return entry.places;
};

const writeCache = (query: string, places: KakaoPlace[]) => {
  // 가장 오래된 항목부터 밀어내 메모리가 늘지 않게 함(Map은 넣은 순서를 유지)
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(cacheKey(query), { at: Date.now(), places });
};

const requestKakao = async <T>(
  kind: 'keyword' | 'address',
  query: string,
  size: number,
  schema: z.ZodType<T>,
  apiKey: string,
  signal: AbortSignal | undefined,
): Promise<T> => {
  const url = new URL(`${KAKAO_LOCAL_BASE}/${kind}.json`);
  url.searchParams.set('query', query);
  url.searchParams.set('size', String(size));
  const timeout = AbortSignal.timeout(KAKAO_TIMEOUT_MS);
  const response = await fetch(url, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
    // 사용자가 검색을 취소(다음 글자 입력·시트 닫기)하면 카카오 호출도 함께 끊음
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    cache: 'no-store',
  });
  if (!response.ok) throw new PlaceSearchUnavailableError(`kakao ${kind} ${response.status}`);
  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) throw new PlaceSearchUnavailableError(`kakao ${kind} schema`);
  return parsed.data;
};

const fromKeyword = (documents: z.infer<typeof keywordSchema>['documents']): KakaoPlace[] =>
  documents.map((doc) => ({
    provider: 'kakao',
    externalId: doc.id,
    name: doc.place_name,
    // 도로명 주소가 있으면 그것을, 없으면 지번 주소를 보임
    address: doc.road_address_name?.trim() || doc.address_name,
  }));

const fromAddress = (documents: z.infer<typeof addressSchema>['documents']): KakaoPlace[] =>
  documents.map((doc) => {
    // 주소 검색에는 장소 id가 없어 주소 문자열로 구분함
    const roadName = doc.road_address?.address_name;
    return {
      provider: 'kakao',
      externalId: `address:${doc.address_name}`,
      name: doc.address_name,
      address: roadName && roadName !== doc.address_name ? roadName : doc.address_name,
    };
  });

/** 카카오 호출 본체(키워드 검색, 결과가 적으면 주소 검색을 더함). 캐시·합류·취소 정책은 `searchKakaoPlaces`가 맡음 */
const runSearch = async (
  query: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<{ places: KakaoPlace[]; degraded: boolean }> => {
  // 한쪽이라도 실패한 결과는 캐시하지 않음(일시 오류가 몇 분 동안 굳지 않게)
  let degraded = false;

  let keywordPlaces: KakaoPlace[] | undefined;
  try {
    const keyword = await requestKakao(
      'keyword',
      query,
      KEYWORD_SIZE,
      keywordSchema,
      apiKey,
      signal,
    );
    keywordPlaces = fromKeyword(keyword.documents);
  } catch {
    // 취소된 요청은 주소 검색으로 넘어가지 않음
    if (signal?.aborted) throw new PlaceSearchUnavailableError('aborted');
    degraded = true;
  }

  let addressPlaces: KakaoPlace[] | undefined;
  if (keywordPlaces === undefined || keywordPlaces.length < ADDRESS_SEARCH_BELOW) {
    try {
      const address = await requestKakao(
        'address',
        query,
        ADDRESS_SIZE,
        addressSchema,
        apiKey,
        signal,
      );
      addressPlaces = fromAddress(address.documents);
    } catch {
      if (keywordPlaces === undefined) throw new PlaceSearchUnavailableError('kakao search failed');
      degraded = true;
    }
  }

  const seen = new Set<string>();
  const places = [...(keywordPlaces ?? []), ...(addressPlaces ?? [])]
    .filter((place) => {
      if (seen.has(place.externalId)) return false;
      seen.add(place.externalId);
      return true;
    })
    .slice(0, MAX_RESULTS);
  if (!degraded) writeCache(query, places);
  return { places, degraded };
};

type SearchResult = { places: KakaoPlace[]; degraded: boolean };
type Flight = { promise: Promise<SearchResult>; waiters: number; controller: AbortController };

// 같은 검색어를 동시에 묻는 요청은 카카오 호출 하나를 함께 기다림(캐시가 채워지기 전의 중복 호출을 막음)
const flights = new Map<string, Flight>();

/**
 * 카카오 로컬 키워드 검색을 먼저 부르고, 결과가 적을 때(주소·지역 검색일 가능성)만 주소 검색을 더해 합친 위치 목록
 * 장소나 지역을 가르거나 막지 않고 검색 결과를 그대로 돌려줌. 좌표는 쓰지 않음(기능 spec 4.3.10)
 * - 키워드 결과가 ADDRESS_SEARCH_BELOW건 이상이면 주소 검색은 부르지 않아 대부분의 장소 이름 검색은 호출 1건
 * - 한쪽만 실패하면 다른 쪽 결과를 쓰고, 둘 다 실패하면 오류
 * - 같은 검색어는 CACHE_TTL_MS 동안 캐시한 결과를 돌려주고, 캐시가 채워지기 전에 동시에 온 같은 검색어는 호출 하나를 함께 기다림
 * - 취소: 합류한 요청이 취소돼도 함께 기다리는 다른 요청은 결과를 받고, 기다리는 요청이 모두 취소됐을 때만 카카오 호출을 끊어 오류로 끝냄
 * - 한쪽이 실패해 일부만 담긴 결과는 `degraded: true`로 알려 브라우저도 캐시하지 않게 함
 */
export const searchKakaoPlaces = (
  query: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<SearchResult> => {
  const cached = readCache(query);
  if (cached) return Promise.resolve({ places: cached, degraded: false });

  const key = cacheKey(query);
  let flight = flights.get(key);
  // 기다리던 요청이 모두 취소돼 이미 끊긴 호출에는 합류하지 않고 새로 시작함(끊긴 호출은 곧 실패로 끝나 합류한 요청까지 실패시킴)
  if (flight?.controller.signal.aborted) flight = undefined;
  if (!flight) {
    const controller = new AbortController();
    const started: Flight = {
      controller,
      waiters: 0,
      promise: runSearch(query, apiKey, controller.signal).finally(() => {
        // 새로 시작한 호출일 때만 비움(끝난 뒤 같은 검색어로 새로 시작한 호출을 지우지 않게)
        if (flights.get(key) === started) flights.delete(key);
      }),
    };
    flights.set(key, started);
    flight = started;
  }

  const joined = flight;
  joined.waiters += 1;
  if (signal) {
    const leave = () => {
      joined.waiters -= 1;
      if (joined.waiters <= 0) joined.controller.abort();
    };
    if (signal.aborted) leave();
    else signal.addEventListener('abort', leave, { once: true });
  }
  return joined.promise;
};
