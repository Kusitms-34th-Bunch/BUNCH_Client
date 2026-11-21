import {
  infiniteQueryOptions,
  queryOptions,
  skipToken,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { sharedKeys } from '@/shared/query/keys';
import type { FollowDecision, FollowRequestPage } from '../model/follows';
import { decideFollowRequest, getFollowRelations, getFollowRequests } from '../api/follows';
import { BUNCH_HOME_MESSAGES } from '../constants/messages';
import { FIRST_PAGE, nextPageOf } from '../lib/pages';
import { bunchHomeKeys } from './keys';

/**
 * 번치의 팔로워·팔로잉(쪽 단위, 목록 끝에서 이어서 받음). 명의(내 기본 번치)를 알기 전(`undefined`)이나 볼 수 없을 때(비공개, 팔로우 승인 전)는 요청하지 않음
 * 명의가 없으면(`null`, 번치 없는 회원) 서버가 정한 명의 없는 상태로 받음
 */
export const followListQueryOptions = (
  bunchId: string,
  viewerId: string | null | undefined,
  kind: 'followers' | 'following',
  canView: boolean,
) =>
  infiniteQueryOptions({
    queryKey: bunchHomeKeys.followPages(bunchId, viewerId ?? null, kind),
    initialPageParam: FIRST_PAGE,
    queryFn:
      viewerId === undefined || !canView
        ? skipToken
        : ({ pageParam, signal }) => getFollowRelations(bunchId, kind, pageParam, signal),
    getNextPageParam: nextPageOf,
  });

// 두 정의가 같은 key에 같은 요청을 쓰도록 한곳에 둠
const requestFollowRequests =
  (viewerId: string) =>
  ({ signal }: { signal: AbortSignal }) =>
    getFollowRequests(viewerId, signal);

/** 내 번치에 온 대기 중인 팔로우 요청(번치를 알 때, `useSuspenseQuery`에도 씀) */
export const bunchFollowRequestsQueryOptions = (viewerId: string) =>
  queryOptions({
    queryKey: bunchHomeKeys.followRequests(viewerId),
    queryFn: requestFollowRequests(viewerId),
    // 같은 key를 미리 받아 둬도 들어올 때마다 다시 받음(아래 정의와 같은 의도)
    refetchOnMount: 'always',
  });

/** 내 번치에 온 대기 중인 팔로우 요청. 내 번치를 모르면 요청하지 않음 */
export const followRequestsQueryOptions = (viewerId: string | undefined) =>
  queryOptions({
    queryKey: bunchHomeKeys.followRequests(viewerId),
    queryFn: viewerId ? requestFollowRequests(viewerId) : skipToken,
    // 번치 홈이 미리 받아 둬도 들어올 때마다 다시 받음(새 요청이 늦게 보이지 않게)
    refetchOnMount: 'always',
  });

type DecideFollowRequest = {
  requestId: string;
  /** 요청한 번치(승인되면 그 번치의 팔로잉 수가 바뀜) */
  requesterId: string;
  decision: FollowDecision;
};

/**
 * 팔로우 요청 승인·거절. 누르는 즉시 그 요청을 목록에서 빼고(실패하면 되돌림), 팔로워 목록·수는 뒤에서 다시 받음
 * 이미 처리됐거나 없어진 요청(applied: false)도 빠진 채로 결과를 돌려줌(안내는 화면 몫)
 */
export const useDecideFollowRequestMutation = (viewerId: string | undefined) => {
  const queryClient = useQueryClient();
  const mutationKey = ['bunch-home', 'decide-follow-request', viewerId];
  return useMutation({
    mutationKey,
    meta: { errorMessage: BUNCH_HOME_MESSAGES.requestDecisionFailed },
    onMutate: async ({ requestId }: DecideFollowRequest) => {
      const key = bunchHomeKeys.followRequests(viewerId);
      await queryClient.cancelQueries({ queryKey: key });
      const page = queryClient.getQueryData<FollowRequestPage>(key);
      const index = page?.items.findIndex((item) => String(item.id) === requestId) ?? -1;
      if (!page || index < 0) return undefined;
      queryClient.setQueryData<FollowRequestPage>(
        key,
        (current) =>
          current && {
            ...current,
            items: current.items.filter((item) => String(item.id) !== requestId),
            totalElements: Math.max(0, current.totalElements - 1),
          },
      );
      // 되돌림은 이 요청 행만(동시에 처리 중인 다른 요청의 제거를 덮지 않게)
      return { item: page.items[index]!, index };
    },
    mutationFn: async ({ requestId, decision }: DecideFollowRequest) => {
      if (!viewerId) throw new Error('요청을 처리할 내 번치가 없습니다.');
      return decideFollowRequest(viewerId, requestId, decision);
    },
    onError: (_error, _variables, removed) => {
      if (!removed) return;
      queryClient.setQueryData<FollowRequestPage>(
        bunchHomeKeys.followRequests(viewerId),
        (current) =>
          // 그 사이 다시 받아 이미 들어 있으면 그대로(같은 행이 두 번 들어가지 않게)
          !current || current.items.some((item) => item.id === removed.item.id)
            ? current
            : {
                ...current,
                items: current.items.toSpliced(removed.index, 0, removed.item),
                totalElements: current.totalElements + 1,
              },
      );
    },
    // 성공·실패 모두 서버 값으로 맞춤(실패는 그 사이 다른 멤버가 처리했을 수 있음). 기다리지 않음
    onSettled: (result, _error, { requesterId }) => {
      if (!viewerId) return;
      // 같은 명의의 다른 처리가 아직 도는 중이면 요청 목록은 마지막 처리가 다시 받음(서버 반영 전 행이 다시 나타나지 않게)
      const othersPending = queryClient.isMutating({ mutationKey }) > 1;
      const requestsKey = JSON.stringify(bunchHomeKeys.followRequests(viewerId));
      void queryClient.invalidateQueries({
        queryKey: bunchHomeKeys.follows(),
        predicate: (query) => !othersPending || JSON.stringify(query.queryKey) !== requestsKey,
      });
      void queryClient.invalidateQueries({ queryKey: sharedKeys.bunchHome(viewerId) });
      // 승인되면 요청한 번치의 팔로잉 수가 늘어 그 번치 프로필도 다시 받음
      if (result?.state === 'APPROVED') {
        void queryClient.invalidateQueries({ queryKey: bunchHomeKeys.otherBunch(requesterId) });
      }
    },
  });
};
