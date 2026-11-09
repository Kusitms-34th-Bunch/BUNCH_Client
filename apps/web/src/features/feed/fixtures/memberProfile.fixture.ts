import { DEFAULT_BUNCH_IMAGES } from '@/shared/lib/bunchProfile';
import type { FeedMemberBunch, FeedMemberProfile } from '../lib/types';

// 멤버 프로필 API 연결 전 예시 값. 줄을 눌러 갈 수 있게 다른 번치 fixture의 번치와 목 서버의 내 번치(`1`)만 씀
// 순서는 화면에서 정렬하므로 섞어 둠
const bunches: FeedMemberBunch[] = [
  {
    id: 'bunch-camping',
    name: '캠핑러버',
    imageSrc: DEFAULT_BUNCH_IMAGES.TYPE_2,
    isPrivate: false,
    followStatus: 'none',
  },
  {
    id: '1',
    name: '여행쥬아',
    imageSrc: DEFAULT_BUNCH_IMAGES.TYPE_1,
    isPrivate: true,
    followStatus: 'none',
  },
  {
    id: 'bunch-book',
    name: '책방산책',
    imageSrc: DEFAULT_BUNCH_IMAGES.TYPE_4,
    isPrivate: true,
    followStatus: 'none',
  },
];

/** 피드 fixture의 멤버(`member-N`)만 있음. 없는 멤버면 undefined */
export function getMemberProfileFixture(memberId: string): FeedMemberProfile | undefined {
  const order = /^member-(\d+)$/.exec(memberId)?.[1];
  if (!order) return undefined;
  return {
    id: memberId,
    name: `멤버 ${order}`,
    imageSrc: DEFAULT_BUNCH_IMAGES.TYPE_3,
    bunches,
  };
}
