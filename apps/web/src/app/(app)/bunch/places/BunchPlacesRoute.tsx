'use client';

import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';
import { BunchPlaces } from '@/features/bunch-places/components';
import { FEED_PATHS } from '@/features/feed/constants/paths';
import { useCheckBundleVisible } from '@/features/feed/queries/bundleDetail';
import { MAIN_TAB_PATHS } from '@/features/main-navigation/constants/tabs';

/**
 * 콕한 장소에서 카드를 눌러 번들 상세로 갈 때의 확인·경로(기능명세서 8.1.5)
 * 번들 상세(피드 기능)의 조회와 경로를 콕(bunch-places)에 직접 잇지 않으려고 route 층에서 조합함
 */
export function BunchPlacesRoute() {
  const checkBundle = useCheckBundleVisible();
  return (
    <BunchPlaces
      backHref={BUNCH_HOME_PATHS.home}
      feedHref={MAIN_TAB_PATHS.feed}
      bundleHref={FEED_PATHS.bundle}
      checkBundle={checkBundle}
    />
  );
}
