'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { useViewerStale } from '../../hooks/useViewerStale';
import { toBlockedBunches } from '../../model/blocks';
import { blockedBunchesQueryOptions, useUnblockBunchMutation } from '../../queries/blocks';
import { bunchHomeQueryOptions } from '../../queries/bunchHome';
import { BunchHomeError } from '../home/BunchHomeError';
import { BunchBlockedListScreen } from './BunchBlockedListScreen';

/**
 * `/bunch/menu/blocked` 차단 목록: 지금 내 번치(`members/me` 기본 번치)가 차단한 번치와 해제(메인·공동 관리자)
 * 역할은 번치 홈 응답의 내 소속, 해제 권한은 서버가 다시 검증
 */
export function BunchBlockedList() {
  const router = useRouter();
  const backOr = useBackOr();
  const me = useQuery(myProfileQueryOptions());
  const bunchId = me.data?.bunch?.id;
  const home = useQuery(bunchHomeQueryOptions(bunchId));
  const blocks = useQuery(blockedBunchesQueryOptions(bunchId));
  const unblock = useUnblockBunchMutation(bunchId);
  const viewer = useViewerStale(bunchId, home, me);
  // 번치가 없는 회원은 차단 목록이 없어 번치 탭(번치 없음 안내)으로
  const noBunch = me.data !== undefined && !me.data.bunch;
  useEffect(() => {
    if (noBunch) router.replace(BUNCH_HOME_PATHS.home);
  }, [noBunch, router]);
  const back = () => backOr(BUNCH_HOME_PATHS.menu);

  if (
    (me.isError && !me.data) ||
    (blocks.isError && !blocks.data) ||
    (home.isError && !home.data) ||
    viewer.mismatch
  ) {
    return (
      <BunchHomeError
        onRetry={() => {
          void me.refetch();
          if (bunchId) {
            void home.refetch();
            void blocks.refetch();
          }
        }}
        onBack={back}
      />
    );
  }

  const role = home.data?.myMembership?.role;
  return (
    <BunchBlockedListScreen
      // 역할(해제 버튼)을 알 때까지 로딩으로 둠(버튼이 나중에 나타나 행이 바뀌지 않게)
      blocked={blocks.data && home.data ? toBlockedBunches(blocks.data) : undefined}
      total={blocks.data?.totalElements}
      // 명의를 다시 확인하는 동안에는 해제 버튼을 숨김
      canUnblock={(role === 'OWNER' || role === 'CO_OWNER') && !viewer.stale}
      onUnblock={(target) => unblock.mutateAsync({ targetId: target.id, blockId: target.blockId })}
      onBack={back}
    />
  );
}
