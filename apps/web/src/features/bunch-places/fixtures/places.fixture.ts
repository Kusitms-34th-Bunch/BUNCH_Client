import type { KokPlace, PlaceMember } from '../lib/types';

// 콕한 장소 API 연결 전 예시(Figma 4096:76101: 전체 12 = 은우 5·경진 4·수인 2·지예 1)
// 번치마다 다른 목록은 API가 정하므로 지금은 모든 번치가 같은 예시를 봄. 멤버 프로필은 기본 이미지로 채움
export const placeMembersFixture: readonly PlaceMember[] = [
  { id: 'eunwoo', name: '은우' },
  { id: 'gyeongjin', name: '경진' },
  { id: 'suin', name: '수인' },
  { id: 'jiye', name: '지예' },
];

const bundle = (bunchName: string, bundleTitle: string) =>
  ({ kind: 'bundle', bunchName, bundleTitle }) as const;

export const placesFixture: readonly KokPlace[] = [
  // 은우 5
  {
    id: 'bomnal-cafe',
    name: '봄날카페',
    address: '제주 제주시 애월읍',
    pickedBy: 'eunwoo',
    pickedAt: '2026-11-07T10:00:00+09:00',
    source: bundle('여행가조', '제주 3박 4일'),
  },
  {
    id: 'gyedong-restaurant',
    name: '계동 골목 식당',
    address: '서울 종로구 계동',
    pickedBy: 'eunwoo',
    pickedAt: '2026-11-06T10:00:00+09:00',
    source: bundle('주말산책', '북촌 골목 한 바퀴'),
  },
  {
    id: 'haeridan-gil',
    name: '해리단길',
    address: '부산 해운대구 우동',
    pickedBy: 'eunwoo',
    pickedAt: '2026-11-05T10:00:00+09:00',
    source: bundle('주말산책', '북촌 골목 한 바퀴'),
  },
  {
    id: 'seongsu-yeonmujang',
    name: '성수 연무장길',
    address: '서울 성동구 성수동',
    pickedBy: 'eunwoo',
    pickedAt: '2026-11-04T10:00:00+09:00',
    source: bundle('빵순이들', '성수 빵지순례'),
  },
  {
    id: 'anmok-coffee',
    name: '안목해변 커피거리',
    address: '강릉 견소동',
    pickedBy: 'eunwoo',
    pickedAt: '2026-11-03T10:00:00+09:00',
    source: { kind: 'unavailable' },
  },
  // 경진 4
  {
    id: 'yeonnam-books',
    name: '연남동 책방',
    address: '서울 마포구 연남동',
    pickedBy: 'gyeongjin',
    pickedAt: '2026-11-02T10:00:00+09:00',
    source: bundle('책방산책', '연남 책방 투어'),
  },
  {
    id: 'namhae-german',
    name: '남해 독일마을',
    address: '경남 남해군 삼동면',
    pickedBy: 'gyeongjin',
    pickedAt: '2026-11-01T10:00:00+09:00',
    source: bundle('여행가조', '남해 1박 2일'),
  },
  {
    id: 'gwangalli',
    name: '광안리 해변',
    address: '부산 수영구 광안동',
    pickedBy: 'gyeongjin',
    pickedAt: '2026-10-30T10:00:00+09:00',
    source: { kind: 'pick' },
  },
  {
    id: 'seochon-hanok',
    name: '서촌 한옥카페',
    address: '서울 종로구 누상동',
    pickedBy: 'gyeongjin',
    pickedAt: '2026-10-28T10:00:00+09:00',
    source: { kind: 'unavailable' },
  },
  // 수인 2
  {
    id: 'jeonju-hanok',
    name: '전주 한옥마을',
    address: '전북 전주시 완산구',
    pickedBy: 'suin',
    pickedAt: '2026-10-26T10:00:00+09:00',
    source: bundle('여행가조', '전주 먹방 여행'),
  },
  {
    id: 'yangyang-surfybeach',
    name: '양양 서피비치',
    address: '강원 양양군 현북면',
    pickedBy: 'suin',
    pickedAt: '2026-10-24T10:00:00+09:00',
    source: { kind: 'pick' },
  },
  // 지예 1
  {
    id: 'hyeopjae-beach',
    name: '협재해변',
    address: '제주 제주시 한림읍',
    pickedBy: 'jiye',
    pickedAt: '2026-10-22T10:00:00+09:00',
    source: bundle('여행가조', '제주 3박 4일'),
  },
];
