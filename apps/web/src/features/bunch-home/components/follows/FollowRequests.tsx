'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';
import { QueryBoundary } from '@/shared/components/boundary/QueryBoundary';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { BUNCH_HOME_MESSAGES } from '../../constants/messages';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { toFollowRequestRows } from '../../model/follows';
import {
  bunchFollowRequestsQueryOptions,
  useDecideFollowRequestMutation,
} from '../../queries/follows';
import { BunchHomeError } from '../home/BunchHomeError';
import { FollowRequestsScreen } from './FollowRequestsScreen';

// 받는 중 화면에는 행이 없어 승인·거절을 부르지 않음
const NOT_READY = () => Promise.reject(new Error('follow requests not loaded'));

/** `/bunch/follows/requests` 내 번치(기본 번치)에 온 대기 중인 팔로우 요청과 승인·거절 */
export function FollowRequests() {
  const backOr = useBackOr();
  const back = () => backOr(BUNCH_HOME_PATHS.follows);
  const pending = <FollowRequestsScreen requests={undefined} onBack={back} onDecide={NOT_READY} />;

  return (
    <QueryBoundary
      pending={pending}
      pendingLabel={BUNCH_HOME_MESSAGES.followListLoading}
      failed={(retry) => <BunchHomeError onRetry={retry} onBack={back} />}
    >
      <FollowRequestsOfMyBunch pending={pending} onBack={back} />
    </QueryBoundary>
  );
}

/** 내 정보로 번치를 알아낸 뒤 그 번치의 요청을 받음. 번치가 없는 회원은 번치 탭(번치 없음 안내)으로 */
function FollowRequestsOfMyBunch({ pending, onBack }: { pending: ReactNode; onBack: () => void }) {
  const router = useRouter();
  const { data: me } = useSuspenseQuery(myProfileQueryOptions());
  const bunchId = me.bunch?.id;
  useEffect(() => {
    if (!bunchId) router.replace(BUNCH_HOME_PATHS.home);
  }, [bunchId, router]);

  return bunchId ? <FollowRequestList bunchId={bunchId} onBack={onBack} /> : pending;
}

function FollowRequestList({ bunchId, onBack }: { bunchId: string; onBack: () => void }) {
  const { data } = useSuspenseQuery(bunchFollowRequestsQueryOptions(bunchId));
  const decide = useDecideFollowRequestMutation(bunchId);
  return (
    <FollowRequestsScreen
      requests={toFollowRequestRows(data)}
      // 첫 쪽만 받으므로 개수는 전체 수
      total={data.totalElements}
      onBack={onBack}
      onDecide={(request, decision) =>
        decide.mutateAsync({ requestId: request.requestId, requesterId: request.id, decision })
      }
    />
  );
}
