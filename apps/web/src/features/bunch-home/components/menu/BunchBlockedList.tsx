'use client';

import { useBackOr } from '@/shared/hooks/useBackOr';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { useBlockedBunches } from '../../hooks/useBlockedBunches';
import { useCurrentBunch } from '../../hooks/useCurrentBunch';
import { isAdminRole } from '../../lib/roles';
import { BunchBlockedListScreen } from './BunchBlockedListScreen';

/**
 * `/bunch/menu/blocked` 차단 목록: 차단 API 연결 전이라 번치 홈에서 고른 번치의 fixture와 메모리 저장소 사용
 */
export function BunchBlockedList() {
  const backOr = useBackOr();
  // 첫 hydration은 저장된 번치를 몰라 목록을 그리지 않음(다른 번치 목록이 잠깐 보이지 않게)
  const { bunch, myRole } = useCurrentBunch();
  const { blocked, unblock } = useBlockedBunches(bunch?.id);

  return (
    <BunchBlockedListScreen
      blocked={blocked}
      canUnblock={isAdminRole(myRole)}
      onUnblock={unblock}
      onBack={() => backOr(BUNCH_HOME_PATHS.menu)}
    />
  );
}
