'use client';

import { notFound } from 'next/navigation';
import { useBackOr } from '@/shared/hooks/useBackOr';
import { BUNCH_HOME_PATHS } from '../../constants/paths';
import { findOtherBunch } from '../../fixtures/otherBunches.fixture';
import { useBlockRelation } from '../../hooks/useBlockRelation';
import { useBunchFollow } from '../../hooks/useBunchFollow';
import { useFollowList } from '../../hooks/useFollowList';
import { BunchFollowsScreen, type FollowsTab } from '../BunchFollowsScreen';
import { BlockedBunchScreen } from './BlockedBunchScreen';

/** `/bunches/[bunchId]/follows` 다른 번치의 팔로워·팔로잉(요청 승인은 그 번치 몫이라 없음). 없는 번치는 404 */
export function OtherBunchFollows({
  bunchId,
  initialTab,
}: {
  bunchId: string;
  initialTab: FollowsTab;
}) {
  const backOr = useBackOr();
  const bunch = findOtherBunch(bunchId);
  // 내가 이 번치를 팔로우하면 팔로워 수도 프로필처럼 한 명 늘어남
  const { status, followerCount } = useBunchFollow(bunch);
  const { followers, following, follow, unfollow } = useFollowList(bunch?.id);
  const { access } = useBlockRelation(bunchId);
  if (!bunch) notFound();

  // 기록이 없으면 프로필로, 차단한 번치면 프로필도 접근 제한이라 피드로
  const back = () =>
    backOr(access === 'blocked' ? BUNCH_HOME_PATHS.feed : BUNCH_HOME_PATHS.otherBunch(bunchId));
  if (access !== 'visible')
    return <BlockedBunchScreen onBack={back} checking={access === 'checking'} />;

  return (
    <BunchFollowsScreen
      bunchName={bunch.name}
      followerCount={followerCount}
      followingCount={bunch.followingCount}
      followers={followers}
      following={following}
      initialTab={initialTab}
      locked={bunch.isPrivate && status !== 'following'}
      onBack={back}
      onFollow={follow}
      onUnfollow={unfollow}
    />
  );
}
