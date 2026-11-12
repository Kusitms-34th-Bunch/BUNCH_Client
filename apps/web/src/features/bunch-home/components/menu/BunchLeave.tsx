'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { toastAfterNavigation } from '@/shared/lib/toastAfterNavigation';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { useMyBunchMemberships } from '../../hooks/useMyBunchMemberships';
import { BunchHomeError } from '../home/BunchHomeError';
import { BunchLeaveScreen } from './BunchLeaveScreen';

/**
 * `/bunch/menu/leave` 메인 관리자의 나가기: 새 관리자를 함께 보내(`successorMembershipId`) 넘기기와 나가기를 한 번에
 * 나간 뒤 번치 탭으로(새 기본 번치나 번치 없음). 넘길 멤버가 없으면(메인 관리자가 아니거나 나만 남음) 더보기 메뉴로
 */
export function BunchLeave() {
  const router = useRouter();
  const backOr = useBackOr();
  const { managed, failed, retry, depart } = useMyBunchMemberships();
  // Figma 1892:36323은 역할과 상관없이 이름순(멤버 관리의 역할순과 다름). 넘길 수 있는지는 서버가 준 동작으로
  const candidates = managed?.members
    .filter((member) => member.actions?.canTransferOwner)
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  const canTransfer =
    managed?.myRole === 'owner' && candidates !== undefined && candidates.length > 0;

  // 나가는 동안에는 떠난 번치가 고정돼 판정이 바뀌지 않음
  useEffect(() => {
    if (managed && !canTransfer) router.replace(BUNCH_HOME_PATHS.menu);
  }, [managed, canTransfer, router]);

  if (failed) return <BunchHomeError onRetry={retry} />;

  return (
    <BunchLeaveScreen
      candidates={canTransfer ? candidates : undefined}
      onBack={() => backOr(BUNCH_HOME_PATHS.menu)}
      onTransferAndLeave={(member) =>
        depart({ kind: 'leave', successorMembershipId: member.id }, () => {
          // 들어온 길(번치 탭 → 메뉴 → 지정 화면)을 두 칸 되돌아가 뒤로 가기 대상에서 뺌(앞으로 가기에는 남음). 기록이 모자라면 replace
          if (window.history.length > 2) window.history.go(-2);
          else router.replace(BUNCH_HOME_PATHS.home);
          toastAfterNavigation(BUNCH_HOME_MESSAGES.transferredAndLeft(member.name));
        })
      }
    />
  );
}
