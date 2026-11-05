import type { FollowBunch } from '../lib/types';
import { findBunchFollows, followBunchesFixture } from '../fixtures/bunchFollows.fixture';
import { followBunch, unfollowBunch, useFollowStatuses } from './useBunchFollow';

/**
 * 번치의 팔로워·팔로잉 목록 행. 버튼 상태는 팔로우 저장소를 반영(프로필에서 바꾼 결과와 같음)
 * addedFollowerIds: 승인한 요청처럼 fixture에 없던 팔로워를 맨 위에 더함
 */
export function useFollowList(
  bunchId: string | undefined,
  addedFollowerIds: readonly string[] = [],
) {
  const statuses = useFollowStatuses();
  const rows = (ids: readonly string[]) =>
    ids.flatMap((id) => {
      const bunch = followBunchesFixture[id];
      return bunch ? [{ ...bunch, followStatus: statuses[id] ?? bunch.followStatus }] : [];
    });
  const follows = bunchId ? findBunchFollows(bunchId) : undefined;
  return {
    followers: rows([...addedFollowerIds, ...(follows?.followers ?? [])]),
    following: rows(follows?.following ?? []),
    follow: (bunch: FollowBunch) => followBunch(bunch),
    unfollow: (bunch: FollowBunch) => unfollowBunch(bunch.id),
  };
}
