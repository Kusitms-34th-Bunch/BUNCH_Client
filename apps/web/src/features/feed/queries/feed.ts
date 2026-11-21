import { infiniteQueryOptions, skipToken, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { persistedFirstPage } from '@/shared/query/persistence';
import { getFeedPage } from '../api/feed';
import { feedKeys } from './keys';

/**
 * 피드를 쪽 단위로 받음. 명의를 알기 전(undefined)에는 요청하지 않음
 * 차단·팔로우·소속 변경이 바로 반영되게 화면에 들어올 때마다 다시 받음
 */
export const feedQueryOptions = (viewerId: string | null | undefined) =>
  infiniteQueryOptions({
    queryKey: feedKeys.list(viewerId ?? null),
    initialPageParam: undefined as string | undefined,
    queryFn:
      viewerId === undefined
        ? skipToken
        : ({ pageParam, signal }) => getFeedPage(pageParam, signal),
    refetchOnMount: 'always',
    // 앱을 다시 열면 지난 첫 쪽을 먼저 보이고 다시 받음(차단·팔로우 변경은 다시 받은 뒤 반영)
    ...persistedFirstPage,
    // 같은 cursor가 다시 오면 무한 반복하지 않고 거기서 끝냄
    getNextPageParam: (lastPage, _pages, _lastParam, allParams) =>
      lastPage.hasNext && lastPage.nextCursor && !allParams.includes(lastPage.nextCursor)
        ? lastPage.nextCursor
        : undefined,
  });

/** 처음부터 다시 받기(받은 쪽을 버림). 번치·팔로우가 바뀌어 커서를 이어 쓸 수 없을 때 */
export const useRestartFeed = (viewerId: string | null | undefined) => {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.resetQueries({ queryKey: feedKeys.list(viewerId ?? null) }),
    [queryClient, viewerId],
  );
};
