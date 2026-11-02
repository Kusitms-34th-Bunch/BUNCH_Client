'use client';

import { notFound, useRouter } from 'next/navigation';
import { BUNCH_HOME_PATHS } from '../constants/paths';
import { findOtherBunch } from '../fixtures/otherBunches.fixture';
import { useBunchFollow } from '../hooks/useBunchFollow';
import { useFollowList } from '../hooks/useFollowList';
import { BunchFollowsScreen, type FollowsTab } from './BunchFollowsScreen';

/** `/bunches/[bunchId]/follows` 다른 번치의 팔로워·팔로잉(요청 승인은 그 번치 몫이라 없음). 없는 번치는 404 */
export function OtherBunchFollows({
  bunchId,
  initialTab,
}: {
  bunchId: string;
  initialTab: FollowsTab;
}) {
  const router = useRouter();
  const bunch = findOtherBunch(bunchId);
  // 내가 이 번치를 팔로우하면 팔로워 수도 프로필처럼 한 명 늘어남
  const { status, followerCount } = useBunchFollow(bunch);
  const { followers, following, follow, unfollow } = useFollowList(bunch?.id);
  if (!bunch) notFound();

  return (
    <BunchFollowsScreen
      bunchName={bunch.name}
      followerCount={followerCount}
      followingCount={bunch.followingCount}
      followers={followers}
      following={following}
      initialTab={initialTab}
      locked={bunch.isPrivate && status !== 'following'}
      onBack={() =>
        window.history.length > 1
          ? router.back()
          : router.replace(BUNCH_HOME_PATHS.otherBunch(bunchId))
      }
      onFollow={follow}
      onUnfollow={unfollow}
    />
  );
}
