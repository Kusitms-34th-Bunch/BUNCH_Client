import { useSyncExternalStore } from 'react';
import type { FollowBunch, FollowStatus, OtherBunch } from '../lib/types';

// 팔로우 API 연결 전 팔로우 처리 결과를 담는 임시 저장소(메모리, 새로고침하면 fixture로 돌아감)
// 연결하면 팔로우·요청·취소 mutation과 프로필 query 갱신으로 대체
const EMPTY: Readonly<Record<string, FollowStatus>> = {};
let changed = EMPTY;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const setStatus = (bunchId: string, status: FollowStatus) => {
  changed = { ...changed, [bunchId]: status };
  listeners.forEach((listener) => listener());
};

const following = (value: FollowStatus) => (value === 'following' ? 1 : 0);

/** 저장소가 덮어쓴 팔로우 상태(번치 id별). 목록이 여러 번치의 상태를 한 번에 읽을 때 사용 */
export function useFollowStatuses() {
  return useSyncExternalStore(
    subscribe,
    () => changed,
    () => EMPTY,
  );
}

/** 공개 번치는 바로 팔로우, 비공개 번치는 요청(승인은 상대 번치 몫) */
export const followBunch = (bunch: Pick<FollowBunch, 'id' | 'isPrivate'>) =>
  setStatus(bunch.id, bunch.isPrivate ? 'requested' : 'following');

/** 언팔로우와 요청 취소 모두 「팔로우 안 함」으로 */
export const unfollowBunch = (bunchId: string) => setStatus(bunchId, 'none');

/** 처음 상태와 비교해 내 번치가 새로 팔로우하거나 그만둔 수(내 번치의 팔로잉 수 갱신용) */
export const followingDelta = (
  statuses: Readonly<Record<string, FollowStatus>>,
  initial: Readonly<Record<string, Pick<FollowBunch, 'followStatus'>>>,
) =>
  Object.entries(statuses).reduce(
    (sum, [bunchId, status]) =>
      sum + following(status) - following(initial[bunchId]?.followStatus ?? 'none'),
    0,
  );

/**
 * 다른 번치의 지금 팔로우 상태와 바꾸는 동작. 팔로워 수는 처음 상태와 비교해 내 번치 한 명만큼 더하거나 뺌
 */
export function useBunchFollow(bunch: OtherBunch | undefined) {
  const all = useFollowStatuses();
  const status = bunch ? (all[bunch.id] ?? bunch.followStatus) : 'none';
  const followerCount = bunch
    ? bunch.followerCount + following(status) - following(bunch.followStatus)
    : 0;
  return {
    status,
    followerCount,
    follow: () => {
      if (bunch) followBunch(bunch);
    },
    unfollow: () => {
      if (bunch) unfollowBunch(bunch.id);
    },
  };
}
