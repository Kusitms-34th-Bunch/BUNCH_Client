'use client';

import { useRouter } from 'next/navigation';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { useBunchProfileEdits } from '../../hooks/useBunchProfileEdits';
import { useCurrentBunch } from '../../hooks/useCurrentBunch';
import { BunchMembersScreen } from './BunchMembersScreen';

/**
 * `/bunch/members` 멤버 관리: 멤버 API 연결 전이라 번치 홈에서 고른 번치의 fixture 멤버와 메모리 저장소 사용
 */
export function BunchMembers() {
  const router = useRouter();
  const backOr = useBackOr();
  const [edits] = useBunchProfileEdits();
  // 첫 hydration은 저장된 번치를 몰라 목록을 그리지 않음(다른 번치 멤버가 잠깐 보이지 않게)
  const { bunch, members, myRole, actions } = useCurrentBunch();

  return (
    <BunchMembersScreen
      bunchName={bunch && (edits[bunch.id]?.name ?? bunch.name)}
      members={members}
      myRole={myRole}
      actions={actions}
      onBack={() => backOr(BUNCH_HOME_PATHS.menu)}
      onInvite={() => router.push(BUNCH_HOME_PATHS.invite)}
    />
  );
}
