'use client';

import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';
import { usePrefetchOtherBunchHome } from '@/features/bunch-home/queries/otherBunch';
import { Feed } from '@/features/feed/components';

// 피드에서 번치 홈 쪽 화면으로 가는 주소(기능끼리 직접 import하지 않고 route에서 조합)
const links = {
  notifications: BUNCH_HOME_PATHS.notifications,
  bunchHome: BUNCH_HOME_PATHS.home,
  otherBunch: BUNCH_HOME_PATHS.otherBunch,
};

export function FeedRoute() {
  // 번들 상세가 쓰는 번치 이름(번치 홈 응답)을 미리 받음. 상세 route와 같은 query
  const prefetchBunch = usePrefetchOtherBunchHome();
  return <Feed links={links} prefetchBunch={prefetchBunch} />;
}
