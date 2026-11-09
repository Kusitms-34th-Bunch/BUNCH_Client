'use client';

import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';
import { FeedScreen } from '@/features/feed/components';

// 피드에서 번치 홈 쪽 화면으로 가는 주소(기능끼리 직접 import하지 않고 route에서 조합)
const links = {
  notifications: BUNCH_HOME_PATHS.notifications,
  bunchHome: BUNCH_HOME_PATHS.home,
  otherBunch: BUNCH_HOME_PATHS.otherBunch,
};

export function FeedRoute() {
  return <FeedScreen links={links} />;
}
