import { DEFAULT_BUNCH_IMAGES } from '@/shared/lib/bunchProfile';
import type { FeedMemberBunch, FeedMemberProfile } from '../lib/types';
import { feedFixture } from './feed.fixture';

// 멤버 프로필 API 연결 전 예시 값. 줄을 눌러 갈 수 있게 다른 번치 fixture의 번치와 목 서버의 내 번치(`1`)만 씀
// 순서는 화면에서 정렬하므로 섞어 둠
const bunches: FeedMemberBunch[] = [
  {
    id: '3',
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
    id: '4',
    name: '책방산책',
    imageSrc: DEFAULT_BUNCH_IMAGES.TYPE_4,
    isPrivate: true,
    followStatus: 'none',
  },
];

/** 피드 fixture에 있는 멤버만 찾음. 없는 멤버면 undefined */
export function getMemberProfileFixture(memberId: string): FeedMemberProfile | undefined {
  const member = [...feedFixture.following, ...feedFixture.public]
    .flatMap((bundle) => bundle.members)
    .find(({ id }) => id === memberId);
  if (!member) return undefined;
  return { id: memberId, name: member.name, imageSrc: member.imageSrc, bunches };
}
