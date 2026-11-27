import { useQueryClient } from '@tanstack/react-query';
import { followListQueryOptions, followRequestsQueryOptions } from './follows';
import { bunchNotificationsQueryOptions } from './notifications';
import { otherBunchMembersQueryOptions } from './otherBunch';

// 미리 받은 목록을 다시 미리 받지 않는 시간(화면에 들어가면 그 화면의 query 설정대로 다시 맞춤)
const PREFETCH_FRESH_MS = 30_000;

/**
 * 내 번치 홈을 그린 뒤 하위 목록(팔로워·팔로잉·팔로우 요청·알림)을 미리 받음. 들어가면 받아 둔 목록으로 바로 그림
 * 실패해도 알리지 않음(화면에 들어가면 다시 받고 그때 오류를 보임)
 */
export const usePrefetchMyBunchLists = () => {
  const queryClient = useQueryClient();
  return (bunchId: string) => {
    for (const kind of ['followers', 'following'] as const) {
      void queryClient.prefetchInfiniteQuery({
        ...followListQueryOptions(bunchId, bunchId, kind, true),
        staleTime: PREFETCH_FRESH_MS,
      });
    }
    void queryClient.prefetchQuery({
      ...followRequestsQueryOptions(bunchId),
      staleTime: PREFETCH_FRESH_MS,
    });
    void queryClient.prefetchInfiniteQuery({
      ...bunchNotificationsQueryOptions(bunchId),
      staleTime: PREFETCH_FRESH_MS,
    });
  };
};

/** 다른 번치 화면을 그린 뒤 볼 수 있는 하위 목록(멤버·팔로워·팔로잉)을 미리 받음 */
export const usePrefetchOtherBunchLists = () => {
  const queryClient = useQueryClient();
  return (
    bunchId: string,
    viewerId: string | null,
    { members, relations }: { members: boolean; relations: boolean },
  ) => {
    if (members) {
      void queryClient.prefetchQuery({
        ...otherBunchMembersQueryOptions(bunchId, viewerId, true),
        staleTime: PREFETCH_FRESH_MS,
      });
    }
    if (!relations) return;
    for (const kind of ['followers', 'following'] as const) {
      void queryClient.prefetchInfiniteQuery({
        ...followListQueryOptions(bunchId, viewerId, kind, true),
        staleTime: PREFETCH_FRESH_MS,
      });
    }
  };
};
