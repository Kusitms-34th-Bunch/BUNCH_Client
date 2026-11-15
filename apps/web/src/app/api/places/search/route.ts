import { NextResponse } from 'next/server';
import { createAuthorizedRoute } from '@/shared/api/server/createAuthorizedRoute';
import { PlaceSearchUnavailableError, searchKakaoPlaces } from './kakaoPlaces';

// 검색어는 두 글자부터(기능 합의), 지나치게 긴 입력은 카카오로 보내지 않음
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 50;

/**
 * 위치 검색: 브라우저에 카카오 키를 두지 않으려고 BFF가 카카오 로컬 API(키워드·주소 검색)를 대신 부름
 * 로그인한 사용자만 쓸 수 있고(access 쿠키), 키는 서버 환경 변수 `KAKAO_REST_API_KEY`에만 둠
 * 응답에는 위치마다 provider·externalId·name·address만 담고 검색 결과는 캐시하지 않음
 */
export const GET = createAuthorizedRoute(async ({ request }) => {
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
    const places = await searchKakaoPlaces(query, apiKey);
    return NextResponse.json({ places }, { headers: { 'Cache-Control': 'no-store' } });
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
