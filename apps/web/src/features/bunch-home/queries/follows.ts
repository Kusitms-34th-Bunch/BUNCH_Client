import { queryOptions, skipToken, useMutation, useQueryClient } from '@tanstack/react-query';
import { sharedKeys } from '@/shared/query/keys';
import type { FollowDecision, FollowRequestPage } from '../model/follows';
import { decideFollowRequest, getFollowRelations, getFollowRequests } from '../api/follows';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { bunchHomeKeys } from './keys';

/**
 * 번치의 팔로워·팔로잉. 명의(내 기본 번치)를 알기 전(`undefined`)이나 볼 수 없을 때(비공개, 팔로우 승인 전)는 요청하지 않음
 * 명의가 없으면(`null`, 번치 없는 회원) 서버가 정한 명의 없는 상태로 받음
 */
export const followListQueryOptions = (
  bunchId: string,
  viewerId: string | null | undefined,
  kind: 'followers' | 'following',
  canView: boolean,
) =>
  queryOptions({
    queryKey: bunchHomeKeys.followList(bunchId, viewerId ?? null, kind),
    queryFn:
      viewerId === undefined || !canView
        ? skipToken
        : ({ signal }) => getFollowRelations(bunchId, kind, signal),
  });

/** 내 번치에 온 대기 중인 팔로우 요청. 내 번치를 모르면 요청하지 않음 */
export const followRequestsQueryOptions = (viewerId: string | undefined) =>
  queryOptions({
    queryKey: bunchHomeKeys.followRequests(viewerId),
    queryFn: viewerId ? ({ signal }) => getFollowRequests(viewerId, signal) : skipToken,
  });

/**
 * 팔로우 요청 승인·거절. 끝나면 그 요청을 목록에서 바로 빼고, 팔로워 목록·수가 바뀌므로 목록과 내 번치 홈을 다시 받음
 * 이미 처리됐거나 없어진 요청(applied: false)도 목록에서 빼고 결과를 돌려줌(안내는 화면 몫)
 */
export const useDecideFollowRequestMutation = (viewerId: string | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { errorMessage: BUNCH_HOME_MESSAGES.requestDecisionFailed },
    mutationFn: async ({
      requestId,
      requesterId,
      decision,
    }: {
      requestId: string;
      /** 요청한 번치(승인되면 그 번치의 팔로잉 수가 바뀜) */
      requesterId: string;
      decision: FollowDecision;
    }) => {
      if (!viewerId) throw new Error('요청을 처리할 내 번치가 없습니다.');
      const result = await decideFollowRequest(viewerId, requestId, decision);
      queryClient.setQueryData<FollowRequestPage>(
        bunchHomeKeys.followRequests(viewerId),
        (page) => {
          if (!page) return page;
          const items = page.items.filter((item) => String(item.id) !== requestId);
          // 이미 빠진 행이면 개수도 그대로
          const removed = page.items.length - items.length;
          return { ...page, items, totalElements: Math.max(0, page.totalElements - removed) };
        },
      );
      void queryClient.invalidateQueries({ queryKey: bunchHomeKeys.follows() });
      void queryClient.invalidateQueries({ queryKey: sharedKeys.bunchHome(viewerId) });
      // 승인되면 요청한 번치의 팔로잉 수가 늘어 그 번치 프로필도 다시 받음
      if (result.state === 'APPROVED') {
        void queryClient.invalidateQueries({ queryKey: bunchHomeKeys.otherBunch(requesterId) });
      }
      return result;
    },
    // 실패하면 그 사이 다른 멤버가 처리했을 수 있어 요청 목록을 다시 받음
    onError: () =>
      queryClient.invalidateQueries({ queryKey: bunchHomeKeys.followRequests(viewerId) }),
  });
};
