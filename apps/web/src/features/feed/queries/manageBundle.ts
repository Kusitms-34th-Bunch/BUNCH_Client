import {
  type InfiniteData,
  type QueryClient,
  queryOptions,
  skipToken,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import { toDomainId } from '@/shared/api/client/ids';
import { sharedKeys } from '@/shared/query/keys';
import type { BundleDetailResponse } from '../model/bundleDetail';
import type { FeedPage } from '../model/feed';
import type { ManagedBundle } from '../model/manageBundle';
import {
  deletePublishedBundle,
  getManagedBundle,
  savePublishedVisibility,
} from '../api/manageBundle';
import { feedKeys } from './keys';

type Target = { bunchId: string; bundleId: string; viewerId: string | null };

/** 공개 범위 화면의 지금 값·버전·수정 권한. 명의를 알기 전(undefined)에는 요청하지 않음 */
export const managedBundleQueryOptions = (
  bunchId: string,
  bundleId: string,
  viewerId: string | null | undefined,
) =>
  queryOptions({
    queryKey: feedKeys.managed(bunchId, bundleId, viewerId ?? null),
    queryFn:
      viewerId === undefined
        ? skipToken
        : ({ signal }) => getManagedBundle(bunchId, bundleId, signal),
  });

/** 받아 둔 피드 쪽에서 그 번들 카드를 뺌(돌아가는 동안 지운·멤버 공개·신고한 카드가 보이지 않게, 피드는 진입마다 다시 받음) */
export const dropFromFeed = (client: QueryClient, bundleId: string) =>
  client.setQueriesData<InfiniteData<FeedPage>>({ queryKey: feedKeys.lists() }, (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.filter(
              (item) => !('bundle' in item && toDomainId(item.bundle.id) === bundleId),
            ),
          })),
        }
      : data,
  );

// 번치 홈의 발행 목록·개수를 바로 다시 받음(상세를 번치 홈에서 열었다가 돌아가는 경우)
const refreshBunchHome = (client: QueryClient, bunchId: string) =>
  void client.invalidateQueries({
    queryKey: sharedKeys.bunchHomeScope(bunchId),
    refetchType: 'all',
  });

/**
 * 발행 번들 삭제(명세 048). 성공하면 피드 카드를 빼고 번치 홈을 다시 받음
 * 상세·댓글 캐시는 떠 있는 상세 화면이 다시 받지 않게 화면이 떠날 때 비움(`useForgetBundle`)
 */
export const useDeletePublishedBundleMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bunchId, bundleId }: Target) => deletePublishedBundle(bunchId, bundleId),
    onSuccess: (_, { bunchId, bundleId }) => {
      dropFromFeed(queryClient, bundleId);
      refreshBunchHome(queryClient, bunchId);
    },
  });
};

/**
 * 번들을 수정해 저장한 뒤(기능명세서 6.2.12): 그 번들의 상세·공개 범위 캐시를 비워 상세가 새로 받게 하고 피드 목록을 다시 받게 함
 * 발행 시각·좋아요·댓글은 그대로라 피드 순서는 서버가 정함
 */
export const useRefreshEditedBundle = (bundleId: string) => {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.removeQueries({ queryKey: feedKeys.bundle(bundleId) });
    void queryClient.invalidateQueries({ queryKey: feedKeys.lists() });
  }, [queryClient, bundleId]);
};

/** 그 번들의 상세·댓글·공개 범위 캐시를 비움(지운 번들에 다시 들어오면 서버가 없음을 알리게) */
export const useForgetBundle = (bundleId: string) => {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.removeQueries({ queryKey: feedKeys.bundle(bundleId) }),
    [queryClient, bundleId],
  );
};

/**
 * 발행 번들 공개 범위 저장(명세 057). 성공하면 공개 범위 조회는 응답으로, 받아 둔 상세는 공개 범위만 바꿈
 * 외부 상세(084)는 멤버 공개를 404로 주므로 상세를 다시 받지 않고 보던 내용을 둠. 멤버 공개면 피드에서도 뺌
 */
export const useSavePublishedVisibilityMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bunchId,
      bundleId,
      value,
      expectedVersion,
    }: Target & { value: 'PUBLIC' | 'PRIVATE'; expectedVersion: number }) =>
      savePublishedVisibility(bunchId, bundleId, { value, expectedVersion }),
    onSuccess: (saved, { bunchId, bundleId, viewerId, value }) => {
      queryClient.setQueryData<ManagedBundle>(feedKeys.managed(bunchId, bundleId, viewerId), saved);
      queryClient.setQueriesData<BundleDetailResponse>(
        { queryKey: feedKeys.details(bundleId, viewerId) },
        (detail) => detail && { ...detail, visibility: saved.visibility ?? value },
      );
      // 발행본은 늘 값이 있지만 비어 오면 보낸 값으로
      if ((saved.visibility ?? value) === 'PRIVATE') dropFromFeed(queryClient, bundleId);
      refreshBunchHome(queryClient, bunchId);
    },
  });
};
