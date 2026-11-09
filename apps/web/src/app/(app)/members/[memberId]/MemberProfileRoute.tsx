'use client';

import { BUNCH_HOME_PATHS } from '@/features/bunch-home/constants/paths';
import { MemberProfileScreen } from '@/features/feed/components';

// 멤버 프로필에서 번치 쪽 화면으로 가는 주소(기능끼리 직접 import하지 않고 route에서 조합)
const links = { bunchHome: BUNCH_HOME_PATHS.home, otherBunch: BUNCH_HOME_PATHS.otherBunch };

export function MemberProfileRoute({ memberId }: { memberId: string }) {
  return <MemberProfileScreen memberId={memberId} links={links} />;
}
