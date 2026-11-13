'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { toFollowRequestRows } from '../../model/follows';
import { followRequestsQueryOptions, useDecideFollowRequestMutation } from '../../queries/follows';
import { BunchHomeError } from '../home/BunchHomeError';
import { FollowRequestsScreen } from './FollowRequestsScreen';

/** `/bunch/follows/requests` 내 번치(기본 번치)에 온 대기 중인 팔로우 요청과 승인·거절 */
export function FollowRequests() {
  const router = useRouter();
  const backOr = useBackOr();
  const me = useQuery(myProfileQueryOptions());
  const bunchId = me.data?.bunch?.id;
  const requests = useQuery(followRequestsQueryOptions(bunchId));
  const decide = useDecideFollowRequestMutation(bunchId);
  // 번치가 없는 회원은 목록이 없어 번치 탭(번치 없음 안내)으로
  const noBunch = me.data !== undefined && !me.data.bunch;
  useEffect(() => {
    if (noBunch) router.replace(BUNCH_HOME_PATHS.home);
  }, [noBunch, router]);
  const back = () => backOr(BUNCH_HOME_PATHS.follows);

  if ((me.isError && !me.data) || (requests.isError && !requests.data)) {
    return (
      <BunchHomeError
        onRetry={() => {
          if (me.isError) void me.refetch();
          if (requests.isError) void requests.refetch();
        }}
        onBack={back}
      />
    );
  }

  return (
    <FollowRequestsScreen
      requests={requests.data ? toFollowRequestRows(requests.data) : undefined}
      onBack={back}
      onDecide={(requestId, decision) => decide.mutateAsync({ requestId, decision })}
    />
  );
}
