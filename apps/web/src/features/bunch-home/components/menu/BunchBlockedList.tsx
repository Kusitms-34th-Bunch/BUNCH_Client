'use client';

import { useBackOr } from '@/shared/hooks/useBackOr';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { bunchDetailsFixture, initialBunchDetailFixture } from '../../fixtures/bunchHome.fixture';
import { useBlockedBunches } from '../../hooks/useBlockedBunches';
import { useBunchMembers } from '../../hooks/useBunchMembers';
import { useCurrentBunchId } from '../../hooks/useCurrentBunchId';
import { BunchBlockedListScreen } from './BunchBlockedListScreen';

/**
 * `/bunch/menu/blocked` 차단 목록: 차단 API 연결 전이라 번치 홈에서 고른 번치의 fixture와 메모리 저장소 사용
 */
export function BunchBlockedList() {
  const backOr = useBackOr();
  const [currentId] = useCurrentBunchId();
  // 첫 hydration은 저장된 번치를 몰라 목록을 그리지 않음(다른 번치 목록이 잠깐 보이지 않게)
  const bunch =
    currentId === null ? undefined : (bunchDetailsFixture[currentId] ?? initialBunchDetailFixture);
  const { blocked, unblock } = useBlockedBunches(bunch?.id);
  // 멤버 관리에서 바뀐 역할 우선(권한 표: 차단·해제는 메인·공동 관리자)
  const { myRole } = useBunchMembers(bunch?.id);
  const role = myRole ?? bunch?.myRole;

  return (
    <BunchBlockedListScreen
      blocked={blocked}
      canUnblock={role === 'owner' || role === 'coOwner'}
      onUnblock={unblock}
      onBack={() => backOr(BUNCH_HOME_PATHS.menu)}
    />
  );
}
