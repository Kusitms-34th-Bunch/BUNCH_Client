import { NextResponse } from 'next/server';
import { createAuthorizedRoute } from '@/shared/api/server/createAuthorizedRoute';
import { PlaceSearchUnavailableError, searchKakaoPlaces } from './kakaoPlaces';
import { checkPlaceSearchRate } from './placeSearchLimit';

// 검색어는 두 글자부터(기능 합의), 지나치게 긴 입력은 카카오로 보내지 않음
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 50;

/**
 * 위치 검색: 브라우저에 카카오 키를 두지 않으려고 BFF가 카카오 로컬 API(키워드·주소 검색)를 대신 부름
 * 로그인한 사용자만 쓸 수 있고(access 쿠키), 키는 서버 환경 변수 `KAKAO_REST_API_KEY`에만 둠
 * 같은 사용자(토큰)와 같은 IP의 호출 수를 제한하고(넘으면 429), 같은 검색어를 동시에 묻는 요청은 카카오 호출 하나를 함께 기다림
 * 응답에는 위치마다 provider·externalId·name·address와 일부 검색이 실패했는지(degraded)만 담고, 브라우저·CDN은 캐시하지 않게 `no-store`를 둠(서버 안의 짧은 캐시는 kakaoPlaces)
 */
export const GET = createAuthorizedRoute(async ({ request, accessToken }) => {
  // 검색어를 검사하기 전에 호출 횟수부터 셈(잘못된 검색어를 반복해도 제한에 걸리게)
  const retryAfter = checkPlaceSearchRate(request, accessToken);
  if (retryAfter !== undefined) {
    return NextResponse.json(
      { message: '잠시 후 다시 검색해 주세요.', code: 'BFF_RATE_LIMITED' },
      { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': String(retryAfter) } },
    );
  }

  const query = (request.nextUrl.searchParams.get('q') ?? '').trim();
  if (query.length < MIN_QUERY_LENGTH || query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { message: '검색어는 2자 이상 50자 이하여야 합니다.', code: 'BFF_INVALID_QUERY' },
      { status: 400 },
    );
  }

  const apiKey = process.env.KAKAO_REST_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: '장소 검색을 사용할 수 없습니다.', code: 'BFF_PLACE_SEARCH_UNAVAILABLE' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    // 브라우저가 요청을 취소하면(다음 글자 입력·시트 닫기) 카카오 호출도 함께 끊음
    const { places, degraded } = await searchKakaoPlaces(query, apiKey, request.signal);
    return NextResponse.json({ places, degraded }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof PlaceSearchUnavailableError) {
      return NextResponse.json(
        { message: '장소 검색에 실패했습니다.', code: 'BFF_PLACE_SEARCH_FAILED' },
        { status: 502, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    throw error;
  }
});
