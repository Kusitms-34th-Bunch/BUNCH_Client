'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { toastAfterNavigation } from '@/shared/lib/toastAfterNavigation';
import { usePrefetchBunchInvitation } from '@/shared/query/bunchInvitation';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { useMyBunchMemberships } from '../../hooks/useMyBunchMemberships';
import { usePrefetchBlockedBunches } from '../../queries/blocks';
import { BunchHomeError } from '../home/BunchHomeError';
import { BunchMenuScreen } from './BunchMenuScreen';

/**
 * `/bunch/menu` 더보기 메뉴: 내 기본 번치의 이름과 멤버 관리 목록의 내 역할로 역할별 메뉴
 * 나가기(일반 멤버·공동 관리자): 서버에서 나간 뒤 번치 탭으로 가고 토스트(새 기본 번치나 번치 없음)
 */
export function BunchMenu() {
  const router = useRouter();
  const backOr = useBackOr();
  const { bunchId, bunchName, managed, failed, retry, depart } = useMyBunchMemberships();
  // 하위 화면을 바로 그리게 미리 받음. 차단 목록은 메뉴를 그리면, 초대 링크(발급 요청)는 「멤버 초대」를 누르기 시작할 때
  const prefetchBlocked = usePrefetchBlockedBunches();
  const prefetchInvitation = usePrefetchBunchInvitation();
  const menuReady = managed !== undefined;
  useEffect(() => {
    if (menuReady && bunchId) prefetchBlocked(bunchId);
  }, [menuReady, bunchId, prefetchBlocked]);

  if (failed)
    return <BunchHomeError onRetry={retry} onBack={() => backOr(BUNCH_HOME_PATHS.home)} />;

  return (
    <BunchMenuScreen
      bunchName={bunchName}
      // 멤버를 알기 전에는 메뉴를 그리지 않음(나만 남은 번치 판정이 늦어 다른 나가기 흐름으로 가지 않게)
      myRole={managed?.myRole}
      // 직접 진입이라 돌아갈 기록이 없으면 번치 홈으로 이동
      onBack={() => backOr(BUNCH_HOME_PATHS.home)}
      alone={managed?.members.length === 1}
      onLeave={() =>
        depart({ kind: 'leave' }, () => {
          // 들어온 길(번치 탭 → 메뉴)을 되돌아가 나간 번치 메뉴를 뒤로 가기 대상에서 뺌(앞으로 가기에는 남음). 직접 진입이면 replace
          backOr(BUNCH_HOME_PATHS.home);
          if (bunchName) toastAfterNavigation(BUNCH_HOME_MESSAGES.left(bunchName));
        })
      }
      onInviteIntent={() => {
        if (bunchId) prefetchInvitation(bunchId);
      }}
      onOwnerLeave={() => router.push(BUNCH_HOME_PATHS.leave)}
      onDeleteBunch={() => router.push(BUNCH_HOME_PATHS.delete)}
    />
  );
}
