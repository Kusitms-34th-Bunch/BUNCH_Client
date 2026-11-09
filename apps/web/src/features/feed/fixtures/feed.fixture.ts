import { DEFAULT_BUNCH_IMAGES } from '@/shared/lib/bunchProfile';
import type { FeedBundle, FeedData } from '../lib/types';

// 피드 API 연결 전 Figma 예시 값(사진은 public/mock/photos)
const HOUR = 3_600_000;
const hoursAgo = (hours: number) => new Date(Date.now() - hours * HOUR).toISOString();
const members = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    name: `멤버 ${index + 1}`,
    imageSrc: DEFAULT_BUNCH_IMAGES.TYPE_3,
    role: index === 0 ? ('owner' as const) : undefined,
  }));
const photos = (...names: string[]) => names.map((name) => ({ src: `/mock/photos/${name}.jpg` }));

const bundle = (overrides: Partial<FeedBundle> & Pick<FeedBundle, 'id'>): FeedBundle => ({
  bunch: { id: 'bunch-trip', name: '여행가조', imageSrc: DEFAULT_BUNCH_IMAGES.TYPE_3 },
  publishedAt: hoursAgo(48),
  title: '제주 3박4일 여행 아카이빙',
  location: '애월읍 외 1곳',
  places: [
    { id: 'place-handam', name: '애월 한담해변', address: '제주 제주시 애월읍', picked: false },
    { id: 'place-halla', name: '한라산', address: '제주 서귀포시 토평동', picked: true },
  ],
  date: '2026년 7월 9일',
  photos: photos('P1', 'P2', 'P3', 'P4'),
  members: members(7),
  liked: false,
  likeCount: 4,
  commentCount: 4,
  ...overrides,
});

export const feedFixture: FeedData = {
  following: [
    // 나간 멤버가 있는 예시
    bundle({ id: 'bundle-1', liked: true, members: [...members(6), { name: '', left: true }] }),
    bundle({
      id: 'bundle-2',
      // 팔로우한 비공개 번치의 번들도 이 구간에 나옴
      bunch: { id: 'bunch-book', name: '책방산책', imageSrc: DEFAULT_BUNCH_IMAGES.TYPE_1 },
      publishedAt: hoursAgo(5),
      title: '노을 지는 동네 책방 투어',
      location: '망원동',
      places: [
        { id: 'place-bookshop', name: '망원동 책방', address: '서울 마포구 망원동', picked: false },
      ],
      photos: photos('S1', 'S2'),
      // 나간 멤버가 앞에 있고 원래 이미지가 남은 예시
      members: [{ name: '', imageSrc: DEFAULT_BUNCH_IMAGES.TYPE_2, left: true }, ...members(2)],
    }),
  ],
  public: [
    bundle({
      id: 'bundle-3',
      bunch: { id: 'bunch-camping', name: '캠핑러버', imageSrc: DEFAULT_BUNCH_IMAGES.TYPE_2 },
      publishedAt: hoursAgo(24 * 10),
      title: '여름밤 바닷가 캠핑',
      location: undefined,
      places: [],
      photos: photos('C1'),
      members: members(2),
      likeCount: 12,
      commentCount: 0,
    }),
  ],
};
