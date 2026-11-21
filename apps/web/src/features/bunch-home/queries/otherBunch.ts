import { isApiError } from '@app/api-core';
import {
  infiniteQueryOptions,
  queryOptions,
  skipToken,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { getBunchMembers } from '@/shared/api/bunchMembers';
import { toDomainId } from '@/shared/api/ids';
import { sharedKeys } from '@/shared/query/keys';
import type { Home } from '../model/bunchHome';
import { getBunchHome, getPublishedBundles } from '../api/bunchHome';
import { followBunch, unfollowBunch } from '../api/follows';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import {
  expectedFollowState,
  type FollowState,
  listFollowOf,
  listVisibilityOf,
  withHomeFollow,
  withListFollow,
} from '../lib/followCache';
import { FIRST_PAGE, nextPageOf } from '../lib/pages';
import { toBunchMembers } from '../model/memberships';
import { bunchHomeKeys } from './keys';

/** 다른 번치 홈. 명의(내 기본 번치)를 알기 전에는 요청하지 않음(`undefined`), 번치가 없으면 `null` */
export const otherBunchHomeQueryOptions = (targetId: string, viewerId: string | null | undefined) =>
  queryOptions({
    queryKey: bunchHomeKeys.otherBunchHome(targetId, viewerId ?? null),
    queryFn: viewerId === undefined ? skipToken : ({ signal }) => getBunchHome(targetId, signal),
  });

/** 다른 번치 홈(번치 이름·이미지)을 미리 받음. 피드 → 번들 상세처럼 상세가 바로 그려져야 할 때. 캐시가 있으면 바로 끝남, 실패는 reject */
export function usePrefetchOtherBunchHome() {
  const queryClient = useQueryClient();
  return (targetId: string, viewerId: string | null) =>
    queryClient.ensureQueryData(otherBunchHomeQueryOptions(targetId, viewerId));
}

/** 다른 번치의 공개 번들(쪽 단위). 볼 수 있을 때만(비공개는 팔로우 승인 뒤) */
export const otherBunchPublishedQueryOptions = (
  targetId: string,
  viewerId: string | null | undefined,
  canView: boolean,
) =>
  infiniteQueryOptions({
    queryKey: bunchHomeKeys.otherBunchPublishedPages(targetId, viewerId ?? null),
    initialPageParam: FIRST_PAGE,
    queryFn:
      viewerId === undefined || !canView
        ? skipToken
        : ({ pageParam, signal }) => getPublishedBundles(targetId, pageParam, signal),
    getNextPageParam: nextPageOf,
  });

/** 다른 번치의 멤버 명단. 볼 수 있을 때만(비공개는 팔로우 승인 뒤) */
export const otherBunchMembersQueryOptions = (
  targetId: string,
  viewerId: string | null | undefined,
  canView: boolean,
) =>
  queryOptions({
    queryKey: bunchHomeKeys.otherBunchMembers(targetId, viewerId ?? null),
    queryFn:
      viewerId === undefined || !canView
        ? skipToken
        : ({ signal }) => getBunchMembers(targetId, signal),
    select: toBunchMembers,
  });

/** 취소의 `followId`는 홈 응답의 관계 ID. 없으면 팔로우 요청(같은 관계를 돌려줌)으로 먼저 얻음 */
export type FollowChange = { kind: 'follow' } | { kind: 'unfollow'; followId: string | undefined };

/**
 * 팔로우·요청·취소. 누르는 즉시 예상 상태(공개는 팔로잉, 비공개는 요청됨, 취소는 없음)를 그 번치 홈과 팔로워·팔로잉 목록에 반영
 * 성공하면 응답 상태로 확정하고 개수·열람 범위는 뒤에서 다시 받음(기다리지 않음). 실패하면 되돌리고 공통 토스트(meta)
 */
export const useFollowBunchMutation = (viewerId: string | null | undefined) => {
  const queryClient = useQueryClient();
  const homeKey = (targetId: string) => bunchHomeKeys.otherBunchHome(targetId, viewerId ?? null);
  // 그 번치 홈과 팔로워·팔로잉 목록을 같은 상태로 바꿈
  const apply = (targetId: string, state: FollowState, followId?: number | null) => {
    queryClient.setQueryData<Home>(homeKey(targetId), (home) =>
      withHomeFollow(home, state, followId),
    );
    queryClient.setQueriesData({ queryKey: bunchHomeKeys.follows() }, (data: unknown) =>
      withListFollow(data, targetId, state, followId),
    );
  };
  return useMutation({
    meta: { errorMessage: BUNCH_HOME_MESSAGES.followFailed },
    onMutate: async ({ targetId, change }: { targetId: string; change: FollowChange }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: homeKey(targetId) }),
        queryClient.cancelQueries({ queryKey: bunchHomeKeys.follows() }),
      ]);
      // 되돌림은 그 번치 항목만 기준값으로(같은 목록에서 동시에 바꾼 다른 번치 행을 덮지 않게)
      const home = queryClient.getQueryData<Home>(homeKey(targetId));
      const lists = queryClient
        .getQueriesData({ queryKey: bunchHomeKeys.follows() })
        .map(([, data]) => data);
      const before = {
        home: home && { followState: home.followState, followId: home.followId },
        row: lists.map((data) => listFollowOf(data, targetId)).find(Boolean),
      };
      // 공개 여부를 캐시에서 모르면 팔로우는 응답을 기다려 반영
      const visibility =
        home?.bunch.visibility ??
        lists.map((data) => listVisibilityOf(data, targetId)).find(Boolean);
      if (change.kind === 'unfollow') apply(targetId, 'NONE', null);
      else if (visibility) apply(targetId, expectedFollowState(visibility));
      return before;
    },
    mutationFn: async ({ targetId, change }: { targetId: string; change: FollowChange }) => {
      if (!viewerId) throw new Error('팔로우할 내 번치가 없습니다.');
      const unfollow = async (followId: string | undefined) => {
        // 팔로우 중일 때만 부르므로, 관계 ID가 없는 응답이면 PUT(이미 있으면 같은 관계)으로 ID를 얻음
        const id =
          followId ??
          (await followBunch(viewerId, targetId).then((found) =>
            found.followId ? toDomainId(found.followId) : undefined,
          ));
        if (!id) throw new Error('팔로우 ID가 없습니다.');
        try {
          return await unfollowBunch(viewerId, targetId, id);
        } catch (error) {
          if (!isApiError(error) || error.status !== 404) throw error;
          // 404는 이미 해제됐거나 오래된 ID라 다시 받아 관계가 없을 때만 성공으로 봄
          const home = await queryClient.fetchQuery({
            ...otherBunchHomeQueryOptions(targetId, viewerId),
            staleTime: 0,
          });
          if (home.followState && home.followState !== 'NONE') throw error;
          return { followState: 'NONE' as const };
        }
      };
      const result =
        change.kind === 'follow'
          ? await followBunch(viewerId, targetId)
          : await unfollow(change.followId);
      // 팔로우 응답에 관계 ID가 없으면 아는 값을 유지(지우면 다음 취소가 ID를 다시 얻으려 PUT을 보냄), 취소는 관계가 없어짐
      apply(
        targetId,
        result.followState,
        change.kind === 'unfollow' ? null : 'followId' in result ? result.followId : undefined,
      );
      return result.followState;
    },
    onError: (_error, { targetId }, before) => {
      const prevHome = before?.home;
      if (prevHome) {
        queryClient.setQueryData<Home>(homeKey(targetId), (home) =>
          withHomeFollow(home, prevHome.followState ?? 'NONE', prevHome.followId ?? null),
        );
      }
      if (before?.row) {
        const { followState, followId } = before.row;
        queryClient.setQueriesData({ queryKey: bunchHomeKeys.follows() }, (data: unknown) =>
          withListFollow(data, targetId, followState, followId),
        );
      }
    },
    // 개수·열람 범위·버튼은 서버 값으로 맞춤(그 번치가 들어 있는 모든 목록, 피드 멤버 프로필은 들어올 때마다 다시 받음)
    onSettled: (_result, _error, { targetId }) => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: bunchHomeKeys.otherBunch(targetId) }),
        queryClient.invalidateQueries({ queryKey: bunchHomeKeys.follows() }),
        ...(viewerId
          ? [queryClient.invalidateQueries({ queryKey: sharedKeys.bunchHome(viewerId) })]
          : []),
      ]);
    },
  });
};
