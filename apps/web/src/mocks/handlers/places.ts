import { http, HttpResponse } from 'msw';
import { fail } from '../lib/envelope';

// 웹 BFF의 장소 검색(`GET /api/places/search`, 카카오 로컬 키워드·주소 검색을 합친 결과)을 흉내 냄
// 실제 BFF와 같이 검색어는 2자 이상 50자 이하이고, 응답은 envelope 없이 `{ places }`
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 50;

const MOCK_PLACES = [
  {
    provider: 'kakao',
    externalId: '1001',
    name: '여의도한강공원',
    address: '서울 영등포구 여의동로 330',
  },
  {
    provider: 'kakao',
    externalId: '1002',
    name: '더현대 서울',
    address: '서울 영등포구 여의대로 108',
  },
  {
    provider: 'kakao',
    externalId: '1003',
    name: 'IFC몰',
    address: '서울 영등포구 국제금융로 10',
  },
  {
    provider: 'kakao',
    externalId: 'address:서울 영등포구 여의도동',
    name: '서울 영등포구 여의도동',
    address: '서울 영등포구 여의도동',
  },
  {
    provider: 'kakao',
    externalId: '1004',
    name: '어디어디 뭐시기 카페',
    address: '서울 마포구 와우산로 94',
  },
  {
    provider: 'kakao',
    externalId: '1005',
    name: '반포한강공원',
    address: '서울 서초구 신반포로11길 40',
  },
];

export const placeHandlers = [
  http.get('/api/places/search', ({ request }) => {
    const query = (new URL(request.url).searchParams.get('q') ?? '').trim();
    if (query.length < MIN_QUERY_LENGTH || query.length > MAX_QUERY_LENGTH) {
      return fail(400, 'BFF_INVALID_QUERY');
    }
    return HttpResponse.json({
      places: MOCK_PLACES.filter(
        (place) => place.name.includes(query) || place.address.includes(query),
      ),
    });
  }),
];
