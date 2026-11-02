import type { Draft, DraftMember, DraftViewer, PlaceResult } from '../lib/types';

// 초안 API 연결 전 Figma 예시 값 사용(저장소에 사진 에셋이 없어 색 그라데이션 SVG를 데이터 주소로 사용)
const samplePhoto = (hue: number) => {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hue},45%,62%)"/>` +
    `<stop offset="1" stop-color="hsl(${(hue + 40) % 360},40%,78%)"/>` +
    `</linearGradient></defs><rect width="300" height="300" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const DEFAULT_AVATAR = '/images/default-bunch.png';

// 확인용 계정: 번치장이자 초안 생성자인 지예(Figma 최종 화면의 「지예 (나)」)
export const draftViewerFixture: DraftViewer = { memberId: 'jiye', bunchRole: 'owner' };

/** 번치 멤버 전체. 참여 멤버가 아닌 멤버는 「멤버 추가하기」에 나옴(번치 멤버 API 연결 전 목 값) */
export const bunchMembersFixture: readonly DraftMember[] = [
  { id: 'jiye', name: '지예', avatarSrc: DEFAULT_AVATAR, bunchRole: 'owner', isCreator: true },
  {
    id: 'gyeongjin',
    name: '경진',
    avatarSrc: DEFAULT_AVATAR,
    bunchRole: 'coOwner',
    isCreator: false,
  },
  { id: 'eunwoo', name: '은우', avatarSrc: DEFAULT_AVATAR, bunchRole: 'member', isCreator: false },
  { id: 'suin', name: '수인', avatarSrc: DEFAULT_AVATAR, bunchRole: 'member', isCreator: false },
  { id: 'hyochan', name: '효찬', avatarSrc: DEFAULT_AVATAR, bunchRole: 'member', isCreator: false },
  {
    id: 'gyeongjun',
    name: '경준',
    avatarSrc: DEFAULT_AVATAR,
    bunchRole: 'member',
    isCreator: false,
  },
  {
    id: 'jaehyeon',
    name: '재현',
    avatarSrc: DEFAULT_AVATAR,
    bunchRole: 'member',
    isCreator: false,
  },
  {
    id: 'seohyeon',
    name: '서현',
    avatarSrc: DEFAULT_AVATAR,
    bunchRole: 'member',
    isCreator: false,
  },
];

export const draftFixture: Draft = {
  id: 'draft-1',
  members: [
    { id: 'jiye', name: '지예', avatarSrc: DEFAULT_AVATAR, bunchRole: 'owner', isCreator: true },
    {
      id: 'gyeongjin',
      name: '경진',
      avatarSrc: DEFAULT_AVATAR,
      bunchRole: 'coOwner',
      isCreator: false,
    },
    {
      id: 'eunwoo',
      name: '은우',
      avatarSrc: DEFAULT_AVATAR,
      bunchRole: 'member',
      isCreator: false,
    },
    { id: 'suin', name: '수인', avatarSrc: DEFAULT_AVATAR, bunchRole: 'member', isCreator: false },
  ],
  title: '퇴근하고 달리는 사람들퇴근하고 달리는 사람들',
  photos: [
    {
      id: 'draft-photo-1',
      src: samplePhoto(205),
      alt: '한강에서 달리는 사람들 1',
      caption: '퇴근하자마자 한강 집합! 힘들었지만 뛰고 나니 뿌듯했던 하루',
      takenAt: '2026-06-20T19:02',
      uploaderId: 'jiye',
    },
    {
      id: 'draft-photo-2',
      src: samplePhoto(190),
      alt: '한강에서 달리는 사람들 2',
      caption: '',
      takenAt: '2026-06-20T19:15',
      uploaderId: 'gyeongjin',
    },
    {
      id: 'draft-photo-3',
      src: samplePhoto(35),
      alt: '한강에서 달리는 사람들 3',
      caption: '',
      takenAt: '2026-06-20T19:40',
      uploaderId: 'eunwoo',
    },
  ],
  locations: [
    { id: 'location-1', name: '서울특별시 여의도동' },
    { id: 'location-2', name: '어디어디 뭐시기 카페' },
  ],
  date: null,
  suggestedDates: ['2026-06-20'],
  comments: [
    {
      memberId: 'jiye',
      text: '오늘도 퇴근하고 다 같이 한강 러닝 완료! 처음엔 다들 피곤하다고 했는데 막상 뛰기 시작하니까 누구보다 열심히 달림ㅋㅋ 다음에는 5km 말고 7km 도전해 보자!',
    },
    {
      memberId: 'gyeongjin',
      text: '오늘은 진짜 집에 가고 싶었는데 다 같이 뛰니까 생각보다 재밌었다ㅎㅎ 다음 러닝도 무조건 참석!',
    },
    {
      memberId: 'eunwoo',
      text: '퇴근하고 뛰는 게 이렇게 상쾌할 줄이야! 다음에는 러닝 끝나고 맛있는 것도 먹으러 가자.',
    },
    {
      memberId: 'suin',
      text: '오늘도 완주 성공! 우리 이러다가 진짜 마라톤 나가는 거 아니야?ㅋㅋㅋ',
    },
  ],
  visibility: null,
  editing: {},
};

/** 장소 검색 API 연결 전 목 결과(키워드가 이름·주소에 들어 있으면 보임) */
export const placeFixture: readonly PlaceResult[] = [
  { id: 'place-1', name: '여의도한강공원', address: '서울특별시 영등포구 여의동로 330' },
  { id: 'place-2', name: '더현대 서울', address: '서울특별시 영등포구 여의대로 108' },
  { id: 'place-3', name: '서울특별시 여의도동', address: '서울특별시 영등포구 여의도동' },
  { id: 'place-4', name: '어디어디 뭐시기 카페', address: '서울특별시 마포구 와우산로 94' },
  { id: 'place-5', name: '반포한강공원', address: '서울특별시 서초구 신반포로11길 40' },
];
