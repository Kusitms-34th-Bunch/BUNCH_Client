'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { myProfileQueryOptions } from '@/shared/query/myProfile';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { useFollowList } from '../../hooks/useFollowList';
import { useViewerStale } from '../../hooks/useViewerStale';
import { bunchHomeQueryOptions } from '../../queries/bunchHome';
import { followRequestsQueryOptions } from '../../queries/follows';
import { BunchFollowsScreen, type FollowsTab } from '../BunchFollowsScreen';
import { BunchHomeError } from '../home/BunchHomeError';

/**
 * `/bunch/follows` 내 번치(기본 번치, `members/me`)의 팔로워·팔로잉. 대기 요청이 있으면 「팔로우 요청 N」 줄
 * 이름·수는 번치 홈 응답, 목록과 행의 팔로우 상태는 서버(명의도 같은 번치)
 */
export function MyBunchFollows({ initialTab }: { initialTab: FollowsTab }) {
  const router = useRouter();
  const backOr = useBackOr();
  const me = useQuery(myProfileQueryOptions());
  const bunchId = me.data?.bunch?.id;
  const home = useQuery(bunchHomeQueryOptions(bunchId));
  const requests = useQuery(followRequestsQueryOptions(bunchId));
  const { followers, following, follow, unfollow } = useFollowList(bunchId ?? '', bunchId, true);
  // 번치가 없는 회원은 목록이 없어 번치 탭(번치 없음 안내)으로
  const noBunch = me.data !== undefined && !me.data.bunch;
  useEffect(() => {
    if (noBunch) router.replace(BUNCH_HOME_PATHS.home);
  }, [noBunch, router]);
  const viewer = useViewerStale(bunchId, home, me);
  const back = () => backOr(BUNCH_HOME_PATHS.home);

  // 다시 받아도 명의가 어긋나거나 다시 받기가 실패하면 버튼을 막아 두지 않고 다시 시도 화면
  if ((me.isError && !me.data) || (home.isError && !home.data) || viewer.mismatch) {
    return (
      <BunchHomeError
        onRetry={() => {
          // 다른 기기에서 번치를 나간 경우 등 내 정보가 바뀌었을 수 있어 항상 다시 받음
          void me.refetch();
          // 번치를 모르면 아직 요청하지 않는 query라 다시 받지 않음(내 정보가 오면 자동으로 받음)
          if (bunchId) {
            void home.refetch();
            if (requests.isError) void requests.refetch();
          }
        }}
        onBack={back}
      />
    );
  }

  return (
    <BunchFollowsScreen
      bunchName={home.data?.bunch.name}
      followerCount={home.data?.followerCount ?? 0}
      followingCount={home.data?.followingCount ?? 0}
      followers={followers}
      following={following}
      // 명의를 다시 확인하는 동안은 팔로우를 보내지 않음
      busy={viewer.stale}
      viewerId={bunchId}
      initialTab={initialTab}
      // 요청 수를 못 받으면 수 없이 줄만 보임(요청 화면에서 다시 시도)
      pendingRequestCount={
        requests.isError && !requests.data ? null : (requests.data?.totalElements ?? 0)
      }
      onOpenRequests={() => router.push(BUNCH_HOME_PATHS.followRequests)}
      onBack={back}
      onFollow={follow}
      onUnfollow={unfollow}
    />
  );
}
