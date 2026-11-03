'use client';

import { useRouter } from 'next/navigation';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { useBunchHome } from '../../hooks/useBunchHome';
import { useCurrentBunchId } from '../../hooks/useCurrentBunchId';
import { useFollowList } from '../../hooks/useFollowList';
import { useFollowRequests } from '../../hooks/useFollowRequests';
import { BunchFollowsScreen, type FollowsTab } from '../BunchFollowsScreen';

/**
 * `/bunch/follows` 내 번치(지금 번치)의 팔로워·팔로잉. 승인한 요청은 팔로워 맨 위에 더하고, 대기 요청이 있으면 「팔로우 요청 N」 줄
 * 팔로우 API 연결 전이라 fixture와 메모리 저장소 사용
 */
export function MyBunchFollows({ initialTab }: { initialTab: FollowsTab }) {
  const router = useRouter();
  // 첫 hydration은 저장된 번치를 몰라 목록을 그리지 않음(다른 번치 목록이 잠깐 보이지 않게)
  const [storedId] = useCurrentBunchId();
  const { data } = useBunchHome();
  const bunch = storedId === null ? undefined : data?.current;
  const { pending, approvedIds } = useFollowRequests(bunch?.id);
  const { followers, following, follow, unfollow } = useFollowList(bunch?.id, approvedIds);

  return (
    <BunchFollowsScreen
      bunchName={bunch?.name}
      followerCount={bunch?.followerCount ?? 0}
      followingCount={bunch?.followingCount ?? 0}
      followers={followers}
      following={following}
      initialTab={initialTab}
      pendingRequestCount={pending.length}
      onOpenRequests={() => router.push(BUNCH_HOME_PATHS.followRequests)}
      onBack={() =>
        window.history.length > 1 ? router.back() : router.replace(BUNCH_HOME_PATHS.home)
      }
      onFollow={follow}
      onUnfollow={unfollow}
    />
  );
}
