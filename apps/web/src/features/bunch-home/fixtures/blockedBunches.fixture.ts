import { DEFAULT_BUNCH_IMAGES } from '@/shared/lib/bunchProfile';
import type { BlockedBunch } from '../lib/types';

// 차단 API 연결 전 번치별 차단 목록(퇴근런클럽은 Figma 1873:33766 예시, 여행가조는 빈 상태 확인용)
export const blockedBunchesFixture: Readonly<Record<string, readonly BlockedBunch[]>> = {
  'bunch-run': [
    { id: 'blocked-night-runners', name: '야간러너스', imageSrc: DEFAULT_BUNCH_IMAGES.TYPE_2 },
    { id: 'blocked-weekend-walk', name: '주말산책', imageSrc: DEFAULT_BUNCH_IMAGES.TYPE_4 },
  ],
  'bunch-trip': [],
  'bunch-gift': [
    { id: 'blocked-food-fighters', name: '먹방원정대', imageSrc: DEFAULT_BUNCH_IMAGES.TYPE_1 },
  ],
};
