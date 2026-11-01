'use client';

import { useRouter } from 'next/navigation';
import { BUNCH_HOME_PATHS } from '../constants/paths';
import { bunchDetailsFixture, initialBunchDetailFixture } from '../fixtures/bunchHome.fixture';
import { useBunchMembers } from '../hooks/useBunchMembers';
import { useBunchProfileEdits } from '../hooks/useBunchProfileEdits';
import { useCurrentBunchId } from '../hooks/useCurrentBunchId';
import { BunchMembersScreen } from './BunchMembersScreen';

/**
 * `/bunch/members` 멤버 관리: 멤버 API 연결 전이라 번치 홈에서 고른 번치의 fixture 멤버와 메모리 저장소 사용
 */
export function BunchMembers() {
  const router = useRouter();
  const [currentId] = useCurrentBunchId();
  const [edits] = useBunchProfileEdits();
  // 첫 hydration은 저장된 번치를 몰라 목록을 그리지 않음(다른 번치 멤버가 잠깐 보이지 않게)
  const bunch =
    currentId === null ? undefined : (bunchDetailsFixture[currentId] ?? initialBunchDetailFixture);
  const { members, myRole, actions } = useBunchMembers(bunch?.id);

  return (
    <BunchMembersScreen
      bunchName={bunch && (edits[bunch.id]?.name ?? bunch.name)}
      members={members}
      myRole={myRole}
      actions={actions}
      onBack={() =>
        window.history.length > 1 ? router.back() : router.replace(BUNCH_HOME_PATHS.menu)
      }
    />
  );
}
