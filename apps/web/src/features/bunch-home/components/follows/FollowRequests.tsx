'use client';

import { useBackOr } from '@/shared/hooks/useBackOr';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { followBunchesFixture } from '../../fixtures/bunchFollows.fixture';
import { useBunchHome } from '../../hooks/useBunchHome';
import { useCurrentBunchId } from '../../hooks/useCurrentBunchId';
import { useFollowRequests } from '../../hooks/useFollowRequests';
import { FollowRequestsScreen } from './FollowRequestsScreen';

/** `/bunch/follows/requests` 내 번치의 대기 중인 팔로우 요청. 팔로우 API 연결 전이라 fixture와 메모리 저장소 사용 */
export function FollowRequests() {
  const backOr = useBackOr();
  const [storedId] = useCurrentBunchId();
  const { data } = useBunchHome();
  const bunchId = storedId === null ? undefined : data?.current.id;
  const { pending, approve, reject } = useFollowRequests(bunchId);

  return (
    <FollowRequestsScreen
      requests={
        bunchId === undefined
          ? undefined
          : pending.flatMap(({ bunchId: requesterId, daysAgo }) => {
              const bunch = followBunchesFixture[requesterId];
              return bunch ? [{ ...bunch, daysAgo }] : [];
            })
      }
      onBack={() => backOr(BUNCH_HOME_PATHS.follows)}
      onApprove={approve}
      onReject={reject}
    />
  );
}
