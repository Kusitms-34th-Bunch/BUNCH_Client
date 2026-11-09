'use client';

import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';
import { BundleDetailScreen } from '@/features/feed/components';

// 상세에서 번치 쪽 화면으로 가는 주소(기능끼리 직접 import하지 않고 route에서 조합)
const links = { bunchHome: BUNCH_HOME_PATHS.home, otherBunch: BUNCH_HOME_PATHS.otherBunch };

export function BundleDetailRoute({
  bundleId,
  focusComments,
}: {
  bundleId: string;
  focusComments: boolean;
}) {
  return <BundleDetailScreen bundleId={bundleId} focusComments={focusComments} links={links} />;
}
