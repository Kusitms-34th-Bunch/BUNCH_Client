import { DEFAULT_BUNCH_IMAGES, DEFAULT_PROFILE_IMAGE } from '@/shared/lib/bunchProfile';
import type { BunchMember, OtherBunch } from '../lib/types';
import { sampleImage } from './bunchHome.fixture';

// 번치 API 연결 전 다른 번치 예시(Figma 3086:68423 공개 여행 번치, 3086:68654 비공개 책방산책)
const members = (names: readonly string[], imageSrc: string): BunchMember[] =>
  names.map((name, index) => ({
    id: `${name}-${index}`,
    name,
    imageSrc,
    role: index === 0 ? 'owner' : index === 1 ? 'coOwner' : 'member',
  }));

export const otherBunchesFixture: Readonly<Record<string, OtherBunch>> = {
  'bunch-camping': {
    id: 'bunch-camping',
    name: '캠핑러버',
    imageSrc: DEFAULT_BUNCH_IMAGES.TYPE_2,
    characterType: 'TYPE_2',
    stage: 1,
    description: '주말마다 캠핑장을 찾아다니는 넷',
    isPrivate: false,
    followerCount: 23,
    followingCount: 8,
    memberCount: 4,
    completedBundles: [200, 35, 190, 210, 25, 230].map((hue, index) => ({
      id: `camping-${index + 1}`,
      title: `캠핑러버 번들 ${index + 1}`,
      coverSrc: sampleImage(hue),
    })),
    followStatus: 'none',
    members: members(['솔', '하람', '도윤', '서아'], DEFAULT_PROFILE_IMAGE),
  },
  'bunch-book': {
    id: 'bunch-book',
    name: '책방산책',
    imageSrc: DEFAULT_BUNCH_IMAGES.TYPE_4,
    characterType: 'TYPE_4',
    stage: 1,
    description: '책과 커피를 기록하는 모임',
    isPrivate: true,
    followerCount: 32,
    followingCount: 12,
    memberCount: 6,
    completedBundles: [120, 300, 60].map((hue, index) => ({
      id: `book-${index + 1}`,
      title: `책방산책 번들 ${index + 1}`,
      coverSrc: sampleImage(hue),
    })),
    followStatus: 'none',
    members: members(['지안', '루아', '하윤', '서진', '다온', '이든'], DEFAULT_PROFILE_IMAGE),
  },
};

// URL 값이라 `__proto__` 같은 상속 속성 이름은 없는 번치로 처리
export const findOtherBunch = (bunchId: string): OtherBunch | undefined =>
  Object.hasOwn(otherBunchesFixture, bunchId) ? otherBunchesFixture[bunchId] : undefined;
