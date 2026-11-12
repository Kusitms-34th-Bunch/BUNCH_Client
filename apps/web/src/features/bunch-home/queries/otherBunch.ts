import { isApiError } from '@app/api-core';
import { queryOptions, skipToken, useMutation, useQueryClient } from '@tanstack/react-query';
import { sharedKeys } from '@/shared/query/keys';
import type { Home } from '../model/bunchHome';
import { getBunchHome, getPublishedBundles } from '../api/bunchHome';
import { followBunch, unfollowBunch } from '../api/follows';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { bunchHomeKeys } from './keys';

/** 다른 번치 홈. 명의(내 기본 번치)를 알기 전에는 요청하지 않음(`undefined`), 번치가 없으면 `null` */
export const otherBunchHomeQueryOptions = (targetId: string, viewerId: string | null | undefined) =>
  queryOptions({
    queryKey: bunchHomeKeys.otherBunchHome(targetId, viewerId ?? null),
    queryFn: viewerId === undefined ? skipToken : ({ signal }) => getBunchHome(targetId, signal),
  });

/** 다른 번치의 공개 번들. 볼 수 있을 때만(비공개는 팔로우 승인 뒤) */
export const otherBunchPublishedQueryOptions = (
  targetId: string,
  viewerId: string | null | undefined,
  canView: boolean,
) =>
  queryOptions({
    queryKey: bunchHomeKeys.otherBunchPublished(targetId, viewerId ?? null),
    queryFn:
      viewerId === undefined || !canView
        ? skipToken
        : ({ signal }) => getPublishedBundles(targetId, signal),
  });

/** 취소의 `followId`는 홈 응답의 관계 ID. 팔로우 중인데 없으면 처리하지 못한 것으로 안내 */
export type FollowChange = { kind: 'follow' } | { kind: 'unfollow'; followId: string | undefined };

/**
 * 팔로우·요청·취소. 성공하면 응답의 상태를 바로 반영하고, 개수·열람 범위가 바뀌므로 그 번치와 내 번치 홈을 다시 받은 뒤 끝냄
 * 실패하면 공통 토스트(meta)와 함께 그 번치를 다시 받음(그 사이 상태가 바뀌었을 수 있음)
 */
export const useFollowBunchMutation = (targetId: string, viewerId: string | null | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { errorMessage: BUNCH_HOME_MESSAGES.followFailed },
    mutationFn: async (change: FollowChange) => {
      if (!viewerId) throw new Error('팔로우할 내 번치가 없습니다.');
      if (change.kind === 'unfollow' && !change.followId) throw new Error('팔로우 ID가 없습니다.');
      const result =
        change.kind === 'follow'
          ? await followBunch(viewerId, targetId)
          : // 이미 해제된 관계(404)는 해제하려던 상태라 성공으로 봄
            await unfollowBunch(viewerId, targetId, change.followId ?? '').catch(
              (error: unknown) => {
                if (isApiError(error) && error.status === 404)
                  return { followState: 'NONE' as const };
                throw error;
              },
            );
      const followId = 'followId' in result && result.followId ? result.followId : null;
      queryClient.setQueryData<Home>(bunchHomeKeys.otherBunchHome(targetId, viewerId), (home) =>
        home ? { ...home, followState: result.followState, followId } : home,
      );
      // ponytail: 팔로우 목록·피드는 아직 샘플이라 무효화 대상 아님, 서버 연결 때 여기에 추가
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: bunchHomeKeys.otherBunch(targetId) }),
        queryClient.invalidateQueries({ queryKey: sharedKeys.bunchHome(viewerId) }),
      ]);
      return result.followState;
    },
    onError: () => queryClient.invalidateQueries({ queryKey: bunchHomeKeys.otherBunch(targetId) }),
  });
};
