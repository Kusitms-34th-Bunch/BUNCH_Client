import {
  type InfiniteData,
  useInfiniteQuery,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';
import { itemsOfPages } from '../lib/pages';
import { type FollowListState, type RelationPage, toFollowRows } from '../model/follows';
import { FOLLOW_STATUS } from '../model/otherBunch';
import { followListQueryOptions } from '../queries/follows';
import { useFollowBunchMutation } from '../queries/otherBunch';

const stateOf = (query: UseInfiniteQueryResult<InfiniteData<RelationPage>>): FollowListState =>
  query.data
    ? {
        rows: toFollowRows({ items: itemsOfPages(query.data.pages, (item) => item.bunch.id) }),
        more: query,
      }
    : query.isError
      ? { error: { retry: () => void query.refetch() } }
      : { rows: undefined };

/**
 * 번치의 팔로워·팔로잉 목록과 행의 팔로우·취소(지금 내 번치 명의)
 * 볼 수 없으면(canView false) 요청하지 않음. 이미 받은 목록이 있으면 다시 받기 실패로 화면을 덮지 않음
 */
export function useFollowList(
  bunchId: string,
  viewerId: string | null | undefined,
  canView: boolean,
) {
  const followers = useInfiniteQuery(
    followListQueryOptions(bunchId, viewerId, 'followers', canView),
  );
  const following = useInfiniteQuery(
    followListQueryOptions(bunchId, viewerId, 'following', canView),
  );
  const change = useFollowBunchMutation(viewerId);
  return {
    followers: stateOf(followers),
    following: stateOf(following),
    follow: async (row: { id: string }) =>
      FOLLOW_STATUS[await change.mutateAsync({ targetId: row.id, change: { kind: 'follow' } })],
    unfollow: (row: { id: string; followId: string | undefined }) =>
      change.mutateAsync({
        targetId: row.id,
        change: { kind: 'unfollow', followId: row.followId },
      }),
  };
}
