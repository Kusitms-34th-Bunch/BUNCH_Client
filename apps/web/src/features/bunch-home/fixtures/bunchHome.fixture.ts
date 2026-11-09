import { DEFAULT_BUNCH_IMAGES } from '@/shared/lib/bunchProfile';
import type { BunchHomeDetail, BunchSummary, DraftBundle } from '../lib/types';

// 번치·번들 API 연결 전 Figma 예시 값 사용(저장소에 사진 에셋이 없어 색 그라데이션 SVG를 데이터 주소로 사용)
export const sampleImage = (hue: number) => {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="246" height="326">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hue},45%,62%)"/>` +
    `<stop offset="1" stop-color="hsl(${(hue + 40) % 360},40%,78%)"/>` +
    `</linearGradient></defs><rect width="246" height="326" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const members = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ name: `멤버 ${index + 1}` }));

const draft = (id: string, title: string, hue: number): DraftBundle => ({
  id,
  title,
  coverSrc: sampleImage(hue),
  members: members(8),
});

export const bunchSummariesFixture: readonly BunchSummary[] = [
  {
    id: 'bunch-run',
    name: '퇴근런클럽',
    imageSrc: DEFAULT_BUNCH_IMAGES.TYPE_2,
    alertCount: 0,
    access: 'active',
  },
  {
    id: 'bunch-trip',
    name: '여행가조',
    imageSrc: DEFAULT_BUNCH_IMAGES.TYPE_3,
    alertCount: 5,
    access: 'active',
  },
  {
    id: 'bunch-gift',
    name: '큐시즘 기프',
    imageSrc: DEFAULT_BUNCH_IMAGES.TYPE_4,
    alertCount: 5,
    access: 'active',
  },
  {
    id: 'bunch-food',
    name: '홍대 먹짱',
    imageSrc: DEFAULT_BUNCH_IMAGES.TYPE_1,
    alertCount: 0,
    access: 'deleted',
  },
  {
    id: 'bunch-meetup',
    name: '큐시즘 밋업',
    imageSrc: DEFAULT_BUNCH_IMAGES.TYPE_1,
    alertCount: 0,
    access: 'removed',
  },
];

export const initialBunchDetailFixture: BunchHomeDetail = {
  id: 'bunch-trip',
  name: '여행가조',
  imageSrc: DEFAULT_BUNCH_IMAGES.TYPE_3,
  characterType: 'TYPE_3',
  stage: 1,
  description: '틈만 나면 떠나는 여행 좋아하는 4명',
  isPrivate: false,
  myRole: 'coOwner',
  followerCount: 23,
  followingCount: 8,
  memberCount: 4,
  completedBundles: [200, 35, 190, 210, 25, 230, 150].map((hue, index) => ({
    id: `bundle-${index + 1}`,
    title: `완성된 번들 ${index + 1}`,
    coverSrc: sampleImage(hue),
  })),
  draftBundles: [
    draft('draft-1', '머그샷', 205),
    draft('draft-2', '다같이츄러스머근날~~~', 30),
    draft('draft-3', '울집강쥐랑다같이만났오', 330),
    draft('draft-4', '나만의거울샷이다ㅏ아ㅏ아아ㅏ', 260),
    draft('draft-5', '부자가되고싶어요', 160),
  ],
};

// 번치마다 내 역할(myRole)이 달라 번치 전환으로 역할별 더보기 메뉴 확인
export const bunchDetailsFixture: Record<string, BunchHomeDetail> = {
  'bunch-run': {
    id: 'bunch-run',
    name: '퇴근런클럽',
    imageSrc: DEFAULT_BUNCH_IMAGES.TYPE_2,
    characterType: 'TYPE_2',
    stage: 1,
    description: '2024년부터 매주 화・목 퇴근 후 함께 뛰는 러닝크루 셋',
    isPrivate: true,
    myRole: 'owner',
    followerCount: 23,
    followingCount: 8,
    memberCount: 5,
    completedBundles: [],
    draftBundles: [],
  },
  'bunch-trip': initialBunchDetailFixture,
  'bunch-gift': {
    id: 'bunch-gift',
    name: '큐시즘 기프',
    imageSrc: DEFAULT_BUNCH_IMAGES.TYPE_4,
    characterType: 'TYPE_4',
    stage: 1,
    description: '큐시즘 기획·프론트 모임',
    isPrivate: false,
    myRole: 'member',
    followerCount: 12,
    followingCount: 4,
    memberCount: 6,
    completedBundles: [],
    draftBundles: [draft('draft-6', '첫 모임', 120)],
  },
};
